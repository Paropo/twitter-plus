// ==UserScript==
// @name        Twitterᴾˡᵘˢ
// @name:zh-TW  Twitterᴾˡᵘˢ
// @name:zh-CN  Twitterᴾˡᵘˢ
// @name:ja     Twitterᴾˡᵘˢ
// @namespace   https://greasyfork.org
// @version     0.3.7
// @description         Enhance the Twitter user experience by loading images in their original quality and removing ads and spam tweets.
// @description:zh-TW   增強Twitter使用體驗。讀取原始畫質的圖片，移除廣告與垃圾推文。
// @description:zh-CN   增强Twitter使用体验。读取原始画质的图片，移除广告与垃圾推文。
// @description:ja      Twitterの利用体験を向上させます。元の高画質で画像をロードします、広告や迷惑なツイートを削除します。
// @author      Pixmi
// @homepage    https://github.com/Pixmi/twitter-plus
// @updateURL   https://github.com/Pixmi/twitter-plus/raw/main/twitter-plus.meta.js
// @downloadURL https://github.com/Pixmi/twitter-plus/raw/main/twitter-plus.user.js
// @supportURL  https://github.com/Pixmi/twitter-plus/issues
// @icon        https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @match       https://twitter.com/*
// @match       https://mobile.twitter.com/*
// @match       https://pbs.twimg.com/media/*
// @license     MPL-2.0
// @license     CC BY-NC 4.0
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @require     https://openuserjs.org/src/libs/sizzle/GM_config.js
// @compatible  Chrome
// @compatible  Firefox
// ==/UserScript==
// Hide the post if the hashtag exceeds the set number. (If set to 0, it will not be enabled)
if (GM_getValue('MAX_HASHTAGS') == undefined) { GM_setValue('MAX_HASHTAGS', 20); }
// Hide the post if it contains the following hashtag. (Please include "#" and separate using commas)
if (GM_getValue('OUT_HASHTAGS') == undefined) { GM_setValue('OUT_HASHTAGS', '#tag1,#tag2'); }
// Change OUT_HASHTAGS type to string
if (typeof GM_getValue('OUT_HASHTAGS') == 'object') { GM_setValue('OUT_HASHTAGS', GM_getValue('OUT_HASHTAGS').join(',')); }
// Custom style.
GM_addStyle(`
iframe#twitter_plus_setting {
    max-width: 300px !important;
    max-height: 300px !important;
}`);

(function () {
    'use strict';

    const getOriginUrl = (imgUrl) => {
        let match = imgUrl.match(/https:\/\/(pbs\.twimg\.com\/media\/[a-zA-Z0-9\-\_]+)(\?format=|.)(jpg|jpeg|png|webp)/);
        if (!match) return false;
        // webp change to jpg
        if (match[3] == 'webp') match[3] = 'jpg';
        // change it to obtain the original quality.
        if (match[2] == '?format=' || !/name=orig/.test(imgUrl)) {
            return `https://${match[1]}.${match[3]}?name=orig`
        } else {
            return false;
        }
    }
    const URL = window.location.href;
    // browsing an image URL
    if (URL.includes('twimg.com')) {
        let originUrl = getOriginUrl(URL);
        if (originUrl) window.location.replace(originUrl);
    }
    // if browsing tweets, activate the observer.
    if (URL.includes('twitter.com')) {
        const rootmatch = document.evaluate('//div[@id="react-root"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const rootnode = rootmatch.singleNodeValue;
        const MAX_HASHTAGS = GM_getValue('MAX_HASHTAGS');
        const OUT_HASHTAGS = GM_getValue('OUT_HASHTAGS').split(',');
        const checkElement = (ele) => {
            return [
                ele.dataset.testid == 'tweet',
                ele.dataset.testid == 'tweetPhoto',
                ele.className == 'css-175oi2r r-1pi2tsx r-u8s1d r-13qz1uu',
            ].some(item => item);
        }
        if (rootnode) {
            const callback = (mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    const target = mutation.target;
                    if (!checkElement(target)) continue;
                    // only the article node needs to be checked for spam or ads.
                    if (target.nodeName == 'ARTICLE') {
                        try {
                            const hashtags = Array.from(target.querySelectorAll('a[href^="/hashtag/"]'), tag => tag.textContent);
                            // exceeding the numbers of hashtags.
                            if (MAX_HASHTAGS > 0 && hashtags.length >= MAX_HASHTAGS) throw target;
                            // containing specified hashtags.
                            if (hashtags.some(tag => OUT_HASHTAGS.find(item => item == tag))) throw target;
                            // ads.
                            if (target.querySelector('svg.r-1q142lx')) throw target;
                        } catch (e) {
                            // hidden tweet
                            if (e) e.closest('div[data-testid="cellInnerDiv"]').style.display = 'none';
                            continue;
                        }
                    }
                    const images = target.querySelectorAll('img');
                    if (!images.length) continue;
                    // tweets image
                    for (const image of images) {
                        let originUrl = getOriginUrl(image.src);
                        if (originUrl) image.src = originUrl;
                        continue;
                    }
                }
            }
            const observer = new MutationObserver(callback);
            // start observe
            observer.observe(document.body, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }
    }
})();

GM_registerMenuCommand('Setting', () => config.open());

const config = new GM_config({
    'id': 'twitter_plus_setting',
    'css': `
        #twitter_plus_setting_wrapper {
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        #twitter_plus_setting_section_0 {
            flex: 1;
        }
        #twitter_plus_setting_buttons_holder {
            text-align: center;
        }
        .config_var {
            display: flex;
            flex-direction: column;
            margin-bottom: 1rem !important;
        }
    `,
    'title': 'Remove Spam',
    'fields': {
        'MAX_HASHTAGS': {
            'label': 'When exceeding how many hashtags?',
            'type': 'number',
            'title': 'input 0 to disable',
            'min': 0,
            'max': 100,
            'default': 20,
        },
        'OUT_HASHTAGS': {
            'label': 'When containing which hashtags?',
            'type': 'textarea',
            'title': 'Must include # and separated by commas.',
            'default': '#tag1,#tag2',
        }
    },
    'events': {
        'init': () => {
            if (GM_getValue('MAX_HASHTAGS')) { config.set('MAX_HASHTAGS', GM_getValue('MAX_HASHTAGS')) }
            if (GM_getValue('OUT_HASHTAGS')) { config.set('OUT_HASHTAGS', GM_getValue('OUT_HASHTAGS')) }
        },
        'save': () => {
            GM_setValue('OUT_HASHTAGS', config.get('OUT_HASHTAGS'));
            GM_setValue('MAX_HASHTAGS', config.get('MAX_HASHTAGS'));
            config.close();
        }
    }
});