// ==UserScript==
// @name          lm 自动签到 
// @namespace    auto-signin
// @version        1.0
// @description    by电子翼·4l兑换
// @match        *://www.lumeow-ai.com/*
// @grant          none 
// @run-at         document-idle 
// @license        CC BY-NC-ND 4.0 
// ==/UserScript== 

(function () {
    'use strict';

    const CONFIG = {
        baseURL: 'https://api.lumeow-ai.com',
        loginPath: '/lm/api/user/login',
        signPath:  '/lm/api/user/sign/V1',
        infoPath:  '/lm/api/user/account/info/V1',
        origin:    'https://www.lumeow-ai.com',
        loginBody: (email, pwd) => JSON.stringify({ nickName: email, password: pwd }),
    };

    const get = (o, p) => p.split('.').reduce((o, k) => (o ? o[k] : undefined), o);
    const wait = ms => new Promise(r => setTimeout(r, ms));

    function req(method, url, headers = {}, body = null) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method, url, headers, data: body, timeout: 15000,
                onload: r => {
                    try { resolve(JSON.parse(r.responseText)); }
                    catch { resolve(r.responseText); }
                },
                onerror: () => reject(new Error('网络错误')),
                ontimeout: () => reject(new Error('请求超时')),
            });
        });
    }

    function findToken(obj) {
        if (!obj) return null;
        if (typeof obj === 'string' && obj.length > 20 && !obj.includes(' ')) return obj;
        if (typeof obj !== 'object') return null;
        for (const k of Object.keys(obj)) {
            if (/token/i.test(k) && typeof obj[k] === 'string' && obj[k]) return obj[k];
            const deep = findToken(obj[k]);
            if (deep) return deep;
        }
        return null;
    }

    const pagesEl  = () => document.getElementById('hj-pages');
    const slotFill = () => document.getElementById('hj-slot-fill');
    const penEl    = () => document.getElementById('hj-pen');
    const pctText  = () => document.getElementById('hj-pct');

    let curPage = null, pageNo = 0;
    const MAX_LINES = 7;

    function newLogPage() {
        pageNo++;
        const p = document.createElement('div');
        p.className = 'hj-page hj-page-log';
        p.innerHTML = `<div class="hj-page-title">📓 签到日记 · 第 ${pageNo} 页</div>`;
        return p;
    }

    async function flipAway(page) {
        page.classList.add('flip');
        await wait(620);
        page.style.display = 'none';
    }

    async function ensurePageSpace() {
        if (!curPage) { curPage = newLogPage(); pagesEl().appendChild(curPage); return; }
        if (curPage.querySelectorAll('.hj-line').length >= MAX_LINES) {
            await flipAway(curPage);
            curPage = newLogPage();
            pagesEl().appendChild(curPage);
        }
    }

    async function log(msg, color = '#857a72') {
        await ensurePageSpace();
        const line = document.createElement('div');
        line.className = 'hj-line';
        line.style.color = color;
        curPage.appendChild(line);
        for (let i = 1; i <= msg.length; i++) {
            line.textContent = msg.slice(0, i);
            await wait(16);
        }
        curPage.scrollTop = curPage.scrollHeight;
    }

    function updateProgress(p) {
        slotFill().style.height = p + '%';
        penEl().style.bottom = `calc(${p}% - 10px)`;
        pctText().textContent = p + '%';
    }

    async function run() {
        const raw = document.getElementById('hj-input').value.trim();
        if (!raw) { await log('⚠️ 请先输入账号，每行一个：邮箱,密码', '#a8926e'); return; }

        const list = raw.split('\n').map(s => s.trim()).filter(Boolean).map(s => s.split(','));
        const total = list.length;
        let ok = 0, fail = 0;

        await log(`🌸 任务开始，共 ${total} 个账号`);

        for (let i = 0; i < total; i++) {
            const [email, pwd] = list[i];
            await log(`────────────────────`);
            await log(`▶ [${i + 1}/${total}] ${email}`);

            try {
                const login = await req('POST', CONFIG.baseURL + CONFIG.loginPath, {
                    'Content-Type': 'application/json',
                    'Origin': CONFIG.origin,
                    'Referer': CONFIG.origin,
                }, CONFIG.loginBody(email, pwd));

                const token = findToken(login);
                if (!token) {
                    await log(`🔍 返回结构：` + JSON.stringify(login).slice(0, 200), '#a8926e');
                    throw new Error('找不到token，请把上面的返回结构发给作者');
                }
                await log(`🔑 登录成功，token 已获取`, '#7d977d');

                const sign = await req('POST', CONFIG.baseURL + CONFIG.signPath, {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'Origin': CONFIG.origin,
                    'Referer': CONFIG.origin,
                }, '{}');
                await log(`📝 签到：${typeof sign === 'string' ? sign.slice(0, 80) : (sign.message || JSON.stringify(sign).slice(0, 80))}`);

                const info = await req('GET', CONFIG.baseURL + CONFIG.infoPath, {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'Origin': CONFIG.origin,
                    'Referer': CONFIG.origin,
                });
                const infoStr = typeof info === 'string' ? info : JSON.stringify(info);

                if (infoStr.includes('success')) {
                    const times = get(info, 'data.dailyTimes');
                    await log(`✅【${email}】签到成功，剩余次数：${times ?? '?'}`, '#7d977d');
                    ok++;
                } else {
                    await log(`❌【${email}】登录或签到失败`, '#a87070');
                    fail++;
                }
            } catch (e) {
                fail++;
                await log(`❌ 出错：${e.message}`, '#a87070');
            }

            updateProgress(Math.round(((i + 1) / total) * 100));
            if (i < total - 1) await wait(1000);
        }

        await log(`☆*: .｡. o(≧▽≦)o .｡.:*☆ 全部完成！`);
        await log(`✅ 成功 ${ok} 个 · ❌ 失败 ${fail} 个`, ok ? '#7d977d' : '#a87070');
    }

    async function startRun() {
        const inputPage = document.querySelector('.hj-page-input');
        inputPage.classList.add('flip');
        await wait(620);
        inputPage.style.display = 'none';
        curPage = newLogPage();
        pagesEl().appendChild(curPage);
        updateProgress(0);
        await run();
    }

    const style = document.createElement('style');
    style.textContent = `
    :root{
        --nm-bg:#ddd6d2;
        --nm-dark:#bcb2ab;
        --nm-light:#f1ece8;
        --nm-accent:#b18e94;
        --nm-accent2:#9d94ac;
        --nm-text:#7d7268;
        --nm-green:#7d977d;
        --nm-red:#a87070;
    }
    #hj-drawer{
        position:fixed;top:0;left:50%;transform:translateX(-50%);
        z-index:999999;height:38px;overflow:hidden;
        transition:height .55s cubic-bezier(.22,1,.36,1);
        font:13px/1.5 "PingFang SC","Segoe UI",sans-serif;
        background:var(--nm-bg);
    }
    #hj-drawer.open{height:560px;}
    #hj-handle{
        width:200px;height:34px;margin:0 auto;cursor:pointer;
        color:var(--nm-text);font-weight:bold;letter-spacing:2px;font-size:13px;
        display:flex;align-items:center;justify-content:center;
        user-select:none;border-radius:0 0 18px 18px;
        background:var(--nm-bg);
        box-shadow:6px 6px 12px var(--nm-dark),-6px -6px 12px var(--nm-light);
    }
    #hj-handle:active{
        box-shadow:inset 4px 4px 8px var(--nm-dark),inset -4px -4px 8px var(--nm-light);
    }
    .hj-book{
        width:430px;height:510px;margin:14px auto 0;
        border-radius:22px;position:relative;
        background:var(--nm-bg);
        box-shadow:12px 12px 24px var(--nm-dark),-12px -12px 24px var(--nm-light);
        display:flex;padding:16px 18px 16px 12px;box-sizing:border-box;
        color:var(--nm-text);
    }
    #hj-close{
        position:absolute;top:14px;right:16px;cursor:pointer;
        color:var(--nm-text);font-size:15px;line-height:1;z-index:10;
        width:28px;height:28px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:3px 3px 6px var(--nm-dark),-3px -3px 6px var(--nm-light);
    }
    #hj-close:active{box-shadow:inset 2px 2px 5px var(--nm-dark),inset -2px -2px 5px var(--nm-light);}
    .hj-spine{
        width:70px;flex-shrink:0;position:relative;
        display:flex;flex-direction:column;align-items:center;
        padding-top:6px;margin-right:14px;
    }
    .hj-spine::before{
        content:"○ ○ ○ ○ ○ ○";
        writing-mode:vertical-rl;letter-spacing:9px;
        font-size:11px;color:var(--nm-dark);margin-bottom:14px;
    }
    .hj-slot{
        width:18px;height:320px;border-radius:10px;
        background:var(--nm-bg);
        box-shadow:inset 4px 4px 8px var(--nm-dark),inset -4px -4px 8px var(--nm-light);
        position:relative;overflow:visible;
    }
    #hj-slot-fill{
        position:absolute;left:2px;right:2px;bottom:2px;height:0%;
        border-radius:8px;
        background:linear-gradient(0deg,var(--nm-accent2),var(--nm-accent));
        box-shadow:0 0 6px rgba(177,142,148,.35);
        transition:height .4s ease;
    }
    #hj-pen{
        position:absolute;left:-9px;bottom:-10px;font-size:19px;z-index:2;
        transition:bottom .4s ease;
        filter:drop-shadow(3px 3px 4px var(--nm-dark));
    }
    #hj-pct{
        margin-top:12px;font-size:12px;font-weight:bold;color:var(--nm-text);
        padding:4px 10px;border-radius:10px;
        box-shadow:inset 3px 3px 6px var(--nm-dark),inset -3px -3px 6px var(--nm-light);
    }
    .hj-pages{flex:1;position:relative;perspective:1200px;}
    .hj-page{
        position:absolute;inset:0;
        border-radius:14px;overflow-y:auto;
        background:var(--nm-bg);
        box-shadow:inset 5px 5px 10px var(--nm-dark),inset -5px -5px 10px var(--nm-light);
        padding:14px;box-sizing:border-box;
        transform-origin:left center;
    }
    .hj-page-title{
        font-size:13px;font-weight:bold;color:var(--nm-text);text-align:center;
        padding:6px 0 8px;margin-bottom:8px;border-radius:8px;
        box-shadow:inset 2px 2px 5px var(--nm-dark),inset -2px -2px 5px var(--nm-light);
    }
    .hj-page.flip{animation:hjFlipOut .6s ease-in forwards;z-index:5;}
    @keyframes hjFlipOut{
        0%  {transform:rotateY(0);opacity:1;}
        100%{transform:rotateY(-175deg);opacity:0;}
    }
    .hj-page-input{display:flex;flex-direction:column;gap:12px;}
    .hj-page-input h3{margin:4px 0 0;text-align:center;color:var(--nm-text);font-size:15px;letter-spacing:1px;}
    #hj-input{
        flex:1;resize:none;box-sizing:border-box;border:none;outline:none;
        border-radius:12px;padding:10px;
        font:12px monospace;color:var(--nm-text);background:var(--nm-bg);
        box-shadow:inset 4px 4px 8px var(--nm-dark),inset -4px -4px 8px var(--nm-light);
    }
    #hj-input::placeholder{color:var(--nm-dark);}
    .hj-tip{font-size:11px;color:var(--nm-dark);margin:0;text-align:center;}
    #hj-btn{
        padding:11px 0;border:none;outline:none;cursor:pointer;
        border-radius:30px;color:var(--nm-light);
        font-size:14px;font-weight:bold;letter-spacing:3px;
        background:linear-gradient(90deg,var(--nm-accent),var(--nm-accent2));
        box-shadow:5px 5px 12px var(--nm-dark),-5px -5px 12px var(--nm-light);
        transition:all .15s;
    }
    #hj-btn:active{
        box-shadow:inset 4px 4px 8px rgba(140,110,115,.5),inset -4px -4px 8px rgba(241,236,232,.4);
        transform:scale(.98);
    }
    .hj-line{
        line-height:26px;min-height:26px;word-break:break-all;
        font-family:monospace;font-size:11.5px;
    }`;
    document.head.appendChild(style);

    const drawer = document.createElement('div');
    drawer.id = 'hj-drawer';
    drawer.innerHTML = `
        <div id="hj-handle">💗 签到小手账 ▾</div>
        <div class="hj-book">
            <span id="hj-close">✕</span>
            <div class="hj-spine">
                <div class="hj-slot">
                    <div id="hj-slot-fill"></div>
                    <div id="hj-pen">🖊️</div>
                </div>
                <div id="hj-pct">0%</div>
            </div>
            <div class="hj-pages" id="hj-pages">
                <div class="hj-page hj-page-input">
                    <h3>🔐 账号密码</h3>
                    <textarea id="hj-input" placeholder="每行一个账号，格式：&#10;邮箱,密码&#10;例如：&#10;12345678@qq.com,mima"></textarea>
                    <p class="hj-tip">写好账号后点下方按钮开始 ✨</p>
                    <button id="hj-btn">✨ 开 始 签 到 ✨</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(drawer);

    document.getElementById('hj-handle').onclick = () => drawer.classList.toggle('open');
    document.getElementById('hj-close').onclick  = () => drawer.classList.remove('open');
    document.getElementById('hj-btn').onclick    = startRun;
})();
