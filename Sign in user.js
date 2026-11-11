// ==UserScript==
// @name ♡自动签到
// @namespace https://chat.mufy.ai
// @version v1.0
// @author 电子翼 | 49652595720
// @match https://chat.mufy.ai/*
// @grant none
// @run-at document-idle
// @license CC BY-NC-ND 4.0
// ==/UserScript==
(function() {
    'use strict';

    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Special+Elite&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const style = document.createElement('style');
    style.innerHTML = `
        #di-wrapper {
            position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
            z-index: 2147483647; display: flex; flex-direction: column; align-items: center;
            pointer-events: none;
        }
        #di-island {
            background: #000; color: #fff; border-radius: 25px;
            width: 120px; height: 36px; overflow: hidden;
            transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            display: flex; align-items: center; justify-content: space-between;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5); cursor: pointer;
            font-family: -apple-system, sans-serif; padding: 0 12px; box-sizing: border-box;
            pointer-events: auto;
        }
        #di-island.expanded { width: 320px; height: 240px; border-radius: 20px; flex-direction: column; padding: 15px; cursor: default; }
        .di-header { display: flex; justify-content: space-between; align-items: center; width: 100%; height: 100%; flex-shrink: 0;}
        #di-island.expanded .di-header { height: 30px; justify-content: center; }
        #di-island.expanded .di-header span { font-size: 14px; font-weight: bold; }
        .di-ring-wrap { display: none; width: 20px; height: 20px; }
        #di-island.running .di-ring-wrap { display: block; }
        .di-ring-bg { fill: none; stroke: #333; stroke-width: 3; }
        .di-ring-progress { fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 56.5; stroke-dashoffset: 56.5; transition: stroke-dashoffset 0.3s linear; transform: rotate(-90deg); transform-origin: 50% 50%; }
        .di-content { display: none; flex-direction: column; gap: 10px; width: 100%; flex: 1; margin-top: 10px;}
        #di-island.expanded .di-content { display: flex; }
        #di-island.running .di-content { display: none; }
        .di-input { width: 100%; height: 120px; background: #111; color: #0f0; border: 1px solid #333; border-radius: 8px; padding: 8px; font-family: monospace; font-size: 12px; resize: none; box-sizing: border-box; }
        .di-btns { display: flex; gap: 10px; width: 100%; }
        .di-btn { flex: 1; background: #fff; color: #000; border: none; border-radius: 8px; padding: 10px; font-weight: bold; cursor: pointer; transition: 0.2s;}
        .di-btn-save { background: #333; color: #fff; flex: 0.6; }
        .di-btn:hover { opacity: 0.8; }
        
        #receipt-box {
            width: 300px; margin-top: -25px;
            display: none; pointer-events: auto;
            flex-direction: column; align-items: center;
            z-index: -1;
        }
        
        @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .receipt-paper {
            background: #f4f1ea;
            width: 100%;
            padding: 25px 20px;
            border-radius: 3px 3px 12px 12px;
            box-shadow: 0 15px 25px rgba(0,0,0,0.3), inset 0 0 40px rgba(139, 115, 85, 0.15), 0 5px 15px rgba(0,0,0,0.1);
            font-family: 'Special Elite', 'Courier New', Courier, monospace;
            font-size: 13px; line-height: 1.6; color: #2b2825;
            position: relative;
            animation: slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        
        .receipt-paper::before {
            content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 6px;
            background: linear-gradient(-45deg, #f4f1ea 33.33%, transparent 33.33%, transparent 66.66%, #f4f1ea 66.66%), 
                        linear-gradient(45deg, #f4f1ea 33.33%, transparent 33.33%, transparent 66.66%, #f4f1ea 66.66%);
            background-size: 10px 10px; background-position: 0 -5px;
        }

        .receipt-paper::after {
            content: ''; position: absolute; bottom: -6px; left: 0; width: 100%; height: 6px;
            background: linear-gradient(-45deg, transparent 33.33%, #f4f1ea 33.33%, #f4f1ea 66.66%, transparent 66.66%), 
                        linear-gradient(45deg, transparent 33.33%, #f4f1ea 33.33%, #f4f1ea 66.66%, transparent 66.66%);
            background-size: 10px 10px; background-position: 0 6px;
            filter: drop-shadow(0 8px 5px rgba(0,0,0,0.3));
        }

        .receipt-title { text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 2px; margin-bottom: 15px; border-bottom: 1px dashed #666; padding-bottom: 10px; }
        .receipt-line { margin-bottom: 4px; word-break: break-all; opacity: 0; animation: typeIn 0.1s forwards; }
        @keyframes typeIn { to { opacity: 1; } }
        .log-ok { color: #1a1a1a; font-weight: bold; }
        .log-err { color: #8b0000; font-weight: bold; }
        .log-warn { color: #555; font-style: italic; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'di-wrapper';
    wrapper.innerHTML = `
        <div id="di-island">
            <div class="di-header">
                <div class="di-ring-wrap">
                    <svg width="20" height="20" viewBox="0 0 20 20">
                        <circle class="di-ring-bg" cx="10" cy="10" r="9"></circle>
                        <circle id="di-ring-progress" class="di-ring-progress" cx="10" cy="10" r="9"></circle>
                    </svg>
                </div>
                <span id="di-title">⚡ 签到</span>
            </div>
            <div class="di-content">
                <textarea id="di-accounts" class="di-input" placeholder="格式：邮箱,密码 (英文逗号)&#10;一行一个"></textarea>
                <div class="di-btns">
                    <button id="di-save" class="di-btn di-btn-save">保存</button>
                    <button id="di-start" class="di-btn">开始打印</button>
                </div>
            </div>
        </div>
        <div id="receipt-box">
            <div class="receipt-paper" id="receipt-paper">
                <div class="receipt-title">MUFY CHECK-IN</div>
                <div id="receipt-logs"></div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);

    const island = document.getElementById('di-island');
    const titleSpan = document.getElementById('di-title');
    const textarea = document.getElementById('di-accounts');
    const startBtn = document.getElementById('di-start');
    const saveBtn = document.getElementById('di-save');
    const receiptBox = document.getElementById('receipt-box');
    const receiptLogs = document.getElementById('receipt-logs');
    const receiptPaper = document.getElementById('receipt-paper');
    const ringProgress = document.getElementById('di-ring-progress');

    const RING_CIRCUMFERENCE = 56.5;

    const savedData = localStorage.getItem('mufy_accounts');
    if (savedData) {
        textarea.value = savedData;
    }

    saveBtn.addEventListener('click', () => {
        localStorage.setItem('mufy_accounts', textarea.value);
        saveBtn.textContent = '已保存!';
        setTimeout(() => { saveBtn.textContent = '保存'; }, 1500);
    });

    island.addEventListener('click', (e) => {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
        if (island.classList.contains('running')) return;
        island.classList.toggle('expanded');
        if(!island.classList.contains('expanded')) {
            receiptBox.style.display = 'none';
        }
    });

    async function run() {
        const lines = textarea.value.trim().split('\n').filter(l => l.trim());
        if (lines.length === 0) return alert('请输入账号密码');

        localStorage.setItem('mufy_accounts', textarea.value);

        island.classList.remove('expanded');
        island.classList.add('running');
        receiptBox.style.display = 'none';
        receiptLogs.innerHTML = '';
        titleSpan.textContent = '连接中...';
        startBtn.disabled = true;

        let logsData = [];
        let success = 0, already = 0, fail = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(',');
            const percent = (i) / lines.length;
            ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE - (percent * RING_CIRCUMFERENCE);
            titleSpan.textContent = `${i+1}/${lines.length}`;

            if (parts.length < 2) {
                logsData.push({ text: `[400] 格式错误: ${line}`, class: 'log-err' });
                fail++;
                continue;
            }
            const email = parts[0].trim();
            const pwd = parts[1].trim();

            try {
                const lRes = await fetch('https://chat.mufy.ai/api/users/login', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email: email, password: pwd })
                });
                const lData = await lRes.json();

                if (!lData.data || !lData.data.token) {
                    logsData.push({ text: `[${lRes.status}] ${email} 登录失败`, class: 'log-err' });
                    logsData.push({ text: `> 密码错误或被拦截`, class: 'log-err' });
                    fail++;
                    continue;
                }

                logsData.push({ text: `[200] ${email} 登录成功`, class: 'log-ok' });

                const cRes = await fetch('https://chat.mufy.ai/api/users/checkin', {
                    method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + lData.data.token},
                    body: JSON.stringify({})
                });
                const cData = await cRes.json();

                if (cData.reason === 'success') {
                    logsData.push({ text: `> 签到成功 +${cData.data?.freeGemAmount || 0} gem`, class: 'log-ok' });
                    success++;
                } else if (cData.error === 'Already checked in today') {
                    logsData.push({ text: `> 今日已签过`, class: 'log-warn' });
                    already++;
                } else {
                    logsData.push({ text: `[${cRes.status}] 签到异常`, class: 'log-err' });
                    fail++;
                }
            } catch (e) {
                logsData.push({ text: `[NETWORK] ${email} 请求崩溃`, class: 'log-err' });
                fail++;
            }
            await new Promise(r => setTimeout(r, 800));
        }

        ringProgress.style.strokeDashoffset = 0;
        titleSpan.textContent = '打印中...';

        logsData.push({ text: `------------------------`, class: 'log-warn' });
        logsData.push({ text: `合计: 成功${success} 已签${already} 失败${fail}`, class: 'log-ok' });

        island.classList.remove('running');
        titleSpan.textContent = '⚡ 签到';
        receiptLogs.innerHTML = '';
        receiptBox.style.display = 'flex';
        
        receiptPaper.style.animation = 'none';
        receiptPaper.offsetHeight; 
        receiptPaper.style.animation = 'slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

        for (let i = 0; i < logsData.length; i++) {
            const div = document.createElement('div');
            div.className = `receipt-line ${logsData[i].class}`;
            div.textContent = logsData[i].text;
            receiptLogs.appendChild(div);
            await new Promise(r => setTimeout(r, 150));
        }

        startBtn.disabled = false;
    }

    startBtn.addEventListener('click', run);
})();