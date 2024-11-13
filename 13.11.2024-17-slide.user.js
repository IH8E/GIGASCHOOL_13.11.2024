// ==UserScript==
// @name         13.11.2024
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Github integration
// @author       Aleksey Komissarov
// @match        https://github.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    // constants
    const HEADER_GITHUB_CLASS = 'js-global-bar';
    const HEADER_CLASS = 'chatbot-header';
    const HEADER_STYLE = 'display: flex;align-items: center;justify-content: center;height: 50px;position: fixed;width: 100%;z-index: 99;top: 100px;';
    const GITHUB_BUTTON_CLASS = 'btn-primary btn';
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
    // logic
    let lastSelectedText = '';
    document.querySelector(`.${HEADER_GITHUB_CLASS}`).insertAdjacentHTML('afterend', getHeader());

    const checkBtn = addButton('Найти опечатки', 'try-chatgpt-find');
    checkBtn.style.display = 'none';

    document.addEventListener('mouseup', () => {
        const selection = document.getSelection();
        const text = selection.toString();
        if (!text) {
            return;
        }
        lastSelectedText = text;
        const { top, left } = findFirstOffsets(selection.focusNode);
        console.log(47, top, left, lastSelectedText);
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

        lastSelectedText = '';
        checkBtn.style.display = 'none';
    };
})();

