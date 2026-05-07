import { decode, detectFormat, SAMPLES } from "./decoder";
import {
  attachCopyHandlers,
  renderError,
  renderFormat,
  renderResults,
  renderShell,
  renderStatus,
} from "./ui";

const root = document.getElementById("app");
if (!root) throw new Error("missing #app root");

renderShell(root);

const $input = root.querySelector<HTMLTextAreaElement>("#input")!;
const $decodeBtn = root.querySelector<HTMLButtonElement>("#decode-btn")!;
const $clearBtn = root.querySelector<HTMLButtonElement>("#clear-btn")!;
const $pill = root.querySelector<HTMLElement>("#format-pill")!;
const $status = root.querySelector<HTMLElement>("#status-bar")!;
const $error = root.querySelector<HTMLElement>("#error-banner")!;
const $results = root.querySelector<HTMLElement>("#results")!;

attachCopyHandlers($results);

function updatePill() {
  renderFormat($pill, detectFormat($input.value));
}

function runDecode() {
  const raw = $input.value.trim();
  if (!raw) {
    renderFormat($pill, "empty");
    renderResults($results, null);
    renderStatus($status, null);
    renderError($error, null);
    return;
  }
  try {
    const t0 = performance.now();
    const { format, result } = decode(raw);
    const dt = performance.now() - t0;
    renderFormat($pill, format);
    if (format === "unknown") {
      renderError(
        $error,
        "Unknown format. Expected an ENR (enr:...), enode URI (enode://...), or multiaddr (/ip4/...).",
      );
      renderResults($results, null);
      renderStatus($status, null);
      return;
    }
    renderError($error, null);
    renderResults($results, result);
    renderStatus($status, { format, decodeMs: dt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    renderError($error, `Decode failed: ${msg}`);
    renderResults($results, null);
    renderStatus($status, null);
  }
}

$decodeBtn.addEventListener("click", runDecode);

$clearBtn.addEventListener("click", () => {
  $input.value = "";
  renderFormat($pill, "empty");
  renderResults($results, null);
  renderStatus($status, null);
  renderError($error, null);
  $input.focus();
});

$input.addEventListener("input", updatePill);

$input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runDecode();
  }
});

root.querySelectorAll<HTMLButtonElement>("[data-sample]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.sample as keyof typeof SAMPLES;
    $input.value = SAMPLES[key];
    updatePill();
    runDecode();
  });
});

renderFormat($pill, "empty");
$input.focus();
