const elements = {
  sync: document.querySelector("#syncStatus"),
  connection: document.querySelector("#connectionState"),
  content: document.querySelector("#contentStatus"),
  shirone: document.querySelector("#shironeStatus"),
  preview: document.querySelector("#previewStatus"),
  previewLink: document.querySelector("#previewLink"),
  refresh: document.querySelector("#refreshButton"),
  validate: document.querySelector("#validateButton"),
  notice: document.querySelector("#notice"),
  mediaCheck: document.querySelector("#mediaCheckButton"),
};

function showNotice(message, isError = false) {
  elements.notice.hidden = false;
  elements.notice.textContent = message;
  elements.notice.classList.toggle("is-error", isError);
}

function setStatus(element, label, ok) {
  element.textContent = label;
  element.classList.toggle("is-ok", ok);
  element.classList.toggle("is-error", !ok);
}

async function refreshStatus() {
  elements.refresh.disabled = true;
  const localHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);
  if (!localHost) {
    setStatus(elements.content, "GitHub 云端内容仓", true);
    setStatus(elements.shirone, "由发布流水线构建", true);
    setStatus(elements.preview, "发布状态待确认，打开博客检查", true);
    elements.connection.classList.add("is-ready");
    elements.connection.lastChild.textContent = " 云端编辑模式";
    elements.sync.textContent = "云端编辑：本地预览状态不可用，保存后请检查部署结果。";
    elements.validate.hidden = true;
    elements.mediaCheck.hidden = true;
    elements.refresh.hidden = true;
    return;
  }
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) throw new Error(`状态接口返回 ${response.status}`);
    const status = await response.json();
    setStatus(elements.content, status.content.exists ? status.content.label : "未找到内容仓", status.content.exists);
    if (status.content.localChanges > 0 && elements.notice.hidden) showNotice(`本地有 ${status.content.localChanges} 项未提交修改。已保存在本地内容仓，尚未提交到 Git；本地预览可继续更新。`);
    setStatus(elements.shirone, status.shirone.exists ? status.shirone.label : "未找到 Shirone", status.shirone.exists);
    setStatus(elements.preview, status.preview.online ? "运行中" : "尚未启动", status.preview.online);
    const sync = status.preview.sync;
    const labels = { pending: '等待更新本地预览…', syncing: '正在更新本地预览…', ready: '本地预览副本已更新（未发布）', error: '本地预览更新失败' };
    elements.sync.textContent = (labels[sync?.phase] || '本地自动预览未启动') + (sync?.error ? `：${sync.error}` : '');
    elements.previewLink.href = status.preview.url;
    const ready = status.content.exists && status.shirone.exists;
    elements.connection.classList.toggle("is-ready", ready);
    elements.connection.classList.toggle("is-error", !ready);
    elements.connection.lastChild.textContent = ready ? " 工作区已连接" : " 工作区需要配置";
  } catch (error) {
    elements.connection.classList.add("is-error");
    elements.connection.lastChild.textContent = " 无法读取本地状态";
    showNotice(error instanceof Error ? error.message : String(error), true);
  } finally {
    elements.refresh.disabled = false;
  }
}

async function validateContent() {
  elements.validate.disabled = true;
  elements.validate.textContent = "检查中…";
  showNotice("正在运行 Shirone 内容校验，请稍候。", false);
  try {
    const response = await fetch("/api/validate", { method: "POST" });
    const result = await response.json();
    showNotice(result.output || (result.ok ? "内容检查通过。" : "内容检查失败。"), !result.ok);
  } catch (error) {
    showNotice(error instanceof Error ? error.message : String(error), true);
  } finally {
    elements.validate.disabled = false;
    elements.validate.textContent = "运行内容检查";
    refreshStatus();
  }
}

elements.refresh.addEventListener("click", refreshStatus);
elements.validate.addEventListener("click", validateContent);
elements.mediaCheck.addEventListener("click", async () => {
  try {
    const response = await fetch('/api/settings-media');
    if (!response.ok) throw new Error('资源检查暂时不可用');
    const report = await response.json();
    showNotice([...report.errors, ...report.media.map(m=>`${m.file} ← ${m.usedBy}`)].join('\n') || '设置中没有本地资源引用。', report.errors.length > 0);
  } catch(error) { showNotice(error.message,true); }
});
refreshStatus();

setInterval(() => { if (!document.hidden) refreshStatus(); }, 5000);
