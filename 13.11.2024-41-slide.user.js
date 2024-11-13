// ==UserScript==
// @name         13.11.2024
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Github integration
// @author       Aleksey Komissarov
// @match        https://github.com/*
// @match        https://trychatgpt.ru/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_addElement
// ==/UserScript==

(function() {
    'use strict';
    // constants
    const CHAT_LINK = 'https://trychatgpt.ru';
    const GITHUB_ADD_COMMENT_SELECTOR = '[data-type="addition"]';
    const HEADER_GITHUB_CLASS = 'js-global-bar';
    const HEADER_CLASS = 'chatbot-header';
    const HEADER_STYLE = 'display: flex;align-items: center;justify-content: center;height: 50px;position: fixed;width: 100%;z-index: 99;top: 100px;';
    const GITHUB_BUTTON_CLASS = 'btn-primary btn';
    const HIDDEN_CLASS = 'has-removed-contents';
    const OFFSET_TOP = '155px';
    const CHAT_INPUT_SELECTOR = '#input';
    const CHAT_SEND_SELECTOR = '#send';
    const CHAT_ANSWERS_SELECTOR = '.message.bot';
    const CHAT_ANSWER_PREFIX = '[ChatGPT]: ';
    const GITHUB_LINK = 'https://github.com';
    const ALLOWED_ORIGINS = ['https://github.com'];
    const CHAT_LOCAL_STORAGE_KEY = 'chat-prompt';
    const CHAT_PROMPT_BUTTON_ID = 'try-chatgpt-find';
    const CHAT_PROMPT = {
        _button: JSON.parse(localStorage.getItem(CHAT_LOCAL_STORAGE_KEY))?.button ?? 'Найти опечатки',
        _text: JSON.parse(localStorage.getItem(CHAT_LOCAL_STORAGE_KEY))?.text ?? 'Поищи опечатки в коде',
        savePrompt() {
            localStorage.setItem(CHAT_LOCAL_STORAGE_KEY, JSON.stringify({ button: this._button, text: this._text }));
        },
        getButtonNode() {
            return document.getElementById(CHAT_PROMPT_BUTTON_ID);
        },
        get button() {
            return this._button
        },
        set button(text) {
            this._button = text;
            this.savePrompt();
            this.getButtonNode().innerText = text;
        },
        get text() {
            return this._text
        },
        set text(text) {
            this._text = text;
            this.savePrompt();
        },
    };
    // helpers
    const getHeader = () => `<nav class="${HEADER_CLASS}" style="${HEADER_STYLE}"><div class="field-group"></div></nav>`;
    const addButton = (text, id) => {
        const button = document.createElement('button');
        button.className = GITHUB_BUTTON_CLASS;
        button.style = 'margin: 0 15px;';
        button.innerHTML = text;
        button.id = id;
        document.querySelector(`.${HEADER_CLASS}`).appendChild(button);

        return button;
    };
    const findFirstOffsets = (el) => el?.getBoundingClientRect?.() ?? findFirstOffsets(el?.parentNode);
    const findFirstElementBySelector = (element, selector) =>
        element?.querySelector?.(selector) ?? findFirstElementBySelector(element?.parentNode, selector);
    const checkIsIframe = () => window.parent !== window && window.location.href.includes(CHAT_LINK);

    const getBtnText = (text) => `${CHAT_PROMPT.text}:\n \`\`\`\n${text}`

    const addListener = (links, cb) => window.addEventListener('message', (event) => {
            if (!links.some((link) => event.origin.includes(link))) return;
            cb(event);
        },
        false,
    );
    const triggerInputChange = (node, value = '') => {
        const setValue = Object.getOwnPropertyDescriptor(node.__proto__, 'value').set;
        const event = new Event('input', { bubbles: true });
        const keyboardEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            keyCode: 13,
        });

        setValue.call(node, value);
        node.dispatchEvent(event);
        node.dispatchEvent(keyboardEvent);
    };

    const addInput = (name, value) => {
        const input = GM_addElement(document.querySelector(`.${HEADER_CLASS}`), 'input', {
            name: `cutom-chatgpt-${name}`,
            value,
            style: 'margin: 0 15px;',
        });
        input.onchange = (e) => CHAT_PROMPT[name] = e.currentTarget.value;
    };

    if (!checkIsIframe()) {
        // logic github
        let lastSelectedText = '';
        let lastFocusNode = null;
        document.querySelector(`.${HEADER_GITHUB_CLASS}`).insertAdjacentHTML('afterend', getHeader());

        const checkBtn = addButton(CHAT_PROMPT.button, 'try-chatgpt-find');
        checkBtn.style.display = 'none';

        document.addEventListener('mouseup', () => {
            const selection = document.getSelection();
            const text = selection.toString();
            if (!text || !selection.focusNode) {
                return;
            }
            lastSelectedText = text;
            lastFocusNode = selection.focusNode;
            const { top, left } = findFirstOffsets(lastFocusNode);
            checkBtn.style.display = 'block';
            checkBtn.style.position = 'fixed';
            checkBtn.style.top = `${top}px`;
            checkBtn.style.left = `${left}px`;
        }, false);

        checkBtn.onclick = async (e) => {
            e.preventDefault();
            if (!lastSelectedText) {
                return;
            }
            iframe.contentWindow.postMessage(getBtnText(lastSelectedText), CHAT_LINK);

            lastSelectedText = '';
            checkBtn.style.display = 'none';
        };
        const iframe = GM_addElement(document.getElementsByTagName('div')[0], 'iframe', {
            src: CHAT_LINK,
            style: 'position: fixed; bottom: 0; right: 0; width: 100%; height: 0%; z-index: 99;'
        });
        // кнопки для переключения iframe
        const toggleBtn = addButton('Показывать фрейм');
        toggleBtn.onclick = async () => {
            iframe.classList.toggle(HIDDEN_CLASS);
        };
        const fullScreenBtn = addButton('Переключить экран');
        fullScreenBtn.onclick = () => {
            const init = '50%';
            iframe.style.height = iframe.style.height === init
                ? `calc(100% - ${OFFSET_TOP})`
                : init;
        }

        addListener([CHAT_LINK], (event) => {
            const text = event.data;
            if (!text?.startsWith?.(CHAT_ANSWER_PREFIX)) {
                return;
            }
            const addCommentBtn = findFirstElementBySelector(lastFocusNode, GITHUB_ADD_COMMENT_SELECTOR);
            const line = addCommentBtn.getAttribute('data-line');
            addCommentBtn.click();
            const hiddenInput = document.querySelector(`[name="position"][value="${line}"]`);
            const textArea = findFirstElementBySelector(hiddenInput, 'textarea');
            triggerInputChange(textArea, text);
        });
        // добавляем кастомизацию
        addInput('button', CHAT_PROMPT.button);
        addInput('text', CHAT_PROMPT.text);
    } else {
        // logic chat
        const removeAllButSelector = (selector, notToRemove) => {
            const elements = document.querySelector(selector);
            [...elements.childNodes].forEach((element) => {
                if (!element?.querySelector?.(notToRemove)) {
                    elements.removeChild(element);
                }
            });
        };
        removeAllButSelector('#allrecords', '[charset="utf-8"], .t-width_100 > style');
        removeAllButSelector('body', '[charset="utf-8"]');

        const input = document.querySelector(CHAT_INPUT_SELECTOR);
        const chatSendBtn = document.querySelector(CHAT_SEND_SELECTOR);
        addListener(ALLOWED_ORIGINS, (event) => {
            triggerInputChange(input, event.data);
            chatSendBtn.click();
            // начинаем следить за ответами
            const allAnswersLength = document.querySelectorAll(CHAT_ANSWERS_SELECTOR).length;
            const interval = window.setInterval(() => {
                const allAnswers = document.querySelectorAll(CHAT_ANSWERS_SELECTOR);
                if (allAnswersLength < allAnswers.length) {
                    window.clearInterval(interval);

                    const text = [...allAnswers].at(-1).getAttribute('data-original-content');
                    window.parent.postMessage(`${CHAT_ANSWER_PREFIX}${text}`, GITHUB_LINK);
                }
            }, 1000);
        });
    }
})();


