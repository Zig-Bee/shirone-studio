const elements = {
  connection: document.querySelector("#connectionState"),
  content: document.querySelector("#contentStatus"),
  shirone: document.querySelector("#shironeStatus"),
  preview: document.querySelector("#previewStatus"),
  previewLink: document.querySelector("#previewLink"),
  refresh: document.querySelector("#refreshButton"),
  validate: document.querySelector("#validateButton"),
  notice: document.querySelector("#notice"),
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
    setStatus(elements.preview, "使用线上博客预览", true);
    elements.connection.classList.add("is-ready");
    elements.connection.lastChild.textContent = " 云端编辑模式";
    elements.validate.hidden = true;
    elements.refresh.hidden = true;
    return;
  }
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) throw new Error(`状态接口返回 ${response.status}`);
    const status = await response.json();
    setStatus(elements.content, status.content.exists ? status.content.label : "未找到内容仓", status.content.exists);
    setStatus(elements.shirone, status.shirone.exists ? status.shirone.label : "未找到 Shirone", status.shirone.exists);
    setStatus(elements.preview, status.preview.online ? "运行中" : "尚未启动", status.preview.online);
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
refreshStatus();
