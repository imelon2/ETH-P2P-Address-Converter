import { type DecodedNode, type InputFormat } from "./decoder";

function formatMs(ms: number): string {
  if (ms < 0.001) return (ms * 1000).toFixed(2) + "µs";
  if (ms < 1) return ms.toFixed(3) + "ms";
  if (ms < 100) return ms.toFixed(2) + "ms";
  return ms.toFixed(1) + "ms";
}

const FORMAT_LABELS: Record<InputFormat, string> = {
  enr: "ENR",
  enode: "Enode",
  multiaddr: "MultiAddress",
  unknown: "Unknown",
  empty: "Awaiting input",
};

export function renderShell(root: HTMLElement) {
  root.innerHTML = `
    <header class="app-header">
      <div>
        <h1 class="app-title">
          <img class="logo" src="/brand.png" alt="ETH P2P Address Converter" width="44" height="44" />
          ETH P2P Address Converter
        </h1>
        <p class="app-subtitle">// decode &amp; convert ENR · enode · multiaddr</p>
      </div>
      <div class="app-header-meta">
        <div>100% client-side · no server</div>
        <div><a href="https://github.com/ethereum/devp2p/blob/master/enr.md" target="_blank" rel="noopener">EIP-778</a> · <a href="https://github.com/multiformats/multiaddr" target="_blank" rel="noopener">multiaddr</a></div>
      </div>
    </header>

    <section class="input-panel">
      <div class="input-label">
        <span class="input-label-text">Input</span>
        <span class="format-pill empty" id="format-pill">Awaiting input</span>
      </div>
      <textarea
        id="input"
        class="input-textarea"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        placeholder="Paste an ENR (enr:-...), enode URI (enode://...), or multiaddr (/ip4/.../tcp/.../p2p/...)"
      ></textarea>
      <div class="input-actions">
        <button class="btn-primary" id="decode-btn" type="button">Decode</button>
        <button class="btn-ghost btn-mini" data-sample="enr" type="button">Sample ENR</button>
        <button class="btn-ghost btn-mini" data-sample="enode" type="button">Sample Enode</button>
        <button class="btn-ghost btn-mini" data-sample="multiaddr" type="button">Sample MultiAddr</button>
        <button class="btn-ghost btn-mini" id="clear-btn" type="button">Clear</button>
      </div>
    </section>

    <div id="status-bar" class="status-bar" hidden></div>
    <div id="error-banner" class="error-banner" hidden></div>

    <section class="results-grid" id="results"></section>

    <footer class="app-footer">
      Built with TypeScript + Vite · <a href="https://github.com/ChainSafe/discv5" target="_blank" rel="noopener">@chainsafe/enr</a> · <a href="https://github.com/multiformats/js-multiaddr" target="_blank" rel="noopener">@multiformats/multiaddr</a>
    </footer>
  `;
}

export function renderFormat(pill: HTMLElement, format: InputFormat) {
  pill.textContent = FORMAT_LABELS[format];
  pill.className = "format-pill";
  if (format === "unknown") pill.classList.add("unknown");
  else if (format === "empty") pill.classList.add("empty");
}

export function renderError(banner: HTMLElement, message: string | null) {
  if (!message) {
    banner.hidden = true;
    banner.textContent = "";
    return;
  }
  banner.hidden = false;
  banner.textContent = "✕ " + message;
}

export function renderStatus(
  bar: HTMLElement,
  parts: { format?: InputFormat; decodeMs?: number } | null,
) {
  if (!parts) {
    bar.hidden = true;
    bar.innerHTML = "";
    return;
  }
  const items: string[] = [];
  if (parts.format && parts.format !== "empty" && parts.format !== "unknown") {
    items.push(`detected: <strong>${FORMAT_LABELS[parts.format]}</strong>`);
  }
  if (typeof parts.decodeMs === "number") {
    items.push(`decoded in <strong>${formatMs(parts.decodeMs)}</strong>`);
  }
  if (!items.length) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  bar.innerHTML = items.join(" · ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function card(
  title: string,
  value: string,
  opts?: { full?: boolean; copy?: boolean; emptyNote?: string },
) {
  const isEmpty = !value;
  const display = isEmpty
    ? escapeHtml(opts?.emptyNote ?? "—")
    : escapeHtml(value);
  const copyBtn = opts?.copy && !isEmpty
    ? `<button class="copy-btn" data-copy="${escapeHtml(value)}" type="button">Copy</button>`
    : "";
  return `
    <div class="result-card${opts?.full ? " full" : ""}">
      <div class="result-head">
        <h3 class="result-title">${title}</h3>
        ${copyBtn}
      </div>
      <div class="result-body${isEmpty ? " empty" : ""}">${display}</div>
    </div>
  `;
}

function detailsCard(details: DecodedNode["details"]) {
  const rows: string[] = [];
  if (details.ip) rows.push(row("IP", details.ip));
  if (details.tcp != null) rows.push(row("TCP", String(details.tcp)));
  if (details.udp != null) rows.push(row("UDP", String(details.udp)));
  if (details.peerId) rows.push(row("Peer ID", details.peerId));
  if (details.publicKey) rows.push(row("PubKey (compressed)", details.publicKey));
  if (details.nodeId) rows.push(row("ENR Node ID", details.nodeId));

  if (details.enrItems) {
    for (const [k, v] of Object.entries(details.enrItems)) {
      if (k === "ip" || k === "tcp" || k === "udp" || k === "secp256k1" || k === "id") continue;
      rows.push(row(`enr: ${k}`, v));
    }
  }

  const body = rows.length
    ? `<table class="detail-table"><tbody>${rows.join("")}</tbody></table>`
    : `<div class="result-body empty">—</div>`;

  return `
    <div class="result-card full">
      <div class="result-head">
        <h3 class="result-title">Details</h3>
      </div>
      ${body}
    </div>
  `;
}

function row(label: string, value: string): string {
  return `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
}

export function renderResults(container: HTMLElement, decoded: DecodedNode | null) {
  if (!decoded) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = [
    card("ENR", decoded.enr, { copy: true, emptyNote: decoded.notes.enr }),
    card("Enode URI", decoded.enode, { copy: true, emptyNote: decoded.notes.enode }),
    card("MultiAddress", decoded.multiaddr, {
      copy: true,
      full: true,
      emptyNote: decoded.notes.multiaddr,
    }),
    detailsCard(decoded.details),
  ].join("");
}

export function attachCopyHandlers(container: HTMLElement) {
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!(target instanceof HTMLButtonElement)) return;
    const text = target.dataset.copy;
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const original = target.textContent;
        target.textContent = "Copied";
        target.classList.add("copied");
        setTimeout(() => {
          target.textContent = original;
          target.classList.remove("copied");
        }, 1200);
      })
      .catch(() => {
        target.textContent = "Copy failed";
        setTimeout(() => (target.textContent = "Copy"), 1200);
      });
  });
}

