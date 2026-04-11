/**
 * dialog.js — Custom dialog system to replace native confirm()/prompt()
 * Provides themed, accessible modal dialogs with animation.
 */

let _dialogResolve = null;
let _dialogContainer = null;

function _ensureContainer() {
    if (_dialogContainer) return _dialogContainer;

    _dialogContainer = document.createElement("div");
    _dialogContainer.id = "custom-dialog-overlay";
    _dialogContainer.className = "dialog-overlay";
    _dialogContainer.innerHTML = `
        <div class="dialog-card" role="dialog" aria-modal="true">
            <div class="dialog-icon" id="dialog-icon"></div>
            <h3 class="dialog-title" id="dialog-title"></h3>
            <p class="dialog-body" id="dialog-body"></p>
            <div class="dialog-input-wrap" id="dialog-input-wrap" style="display:none">
                <label class="dialog-input-label" id="dialog-input-label"></label>
                <input type="text" class="dialog-input" id="dialog-input" autocomplete="off" />
            </div>
            <div class="dialog-actions">
                <button class="btn btn-ghost dialog-btn-cancel" id="dialog-btn-cancel" type="button">Cancelar</button>
                <button class="btn btn-primary dialog-btn-confirm" id="dialog-btn-confirm" type="button">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(_dialogContainer);

    // Close on backdrop click
    _dialogContainer.addEventListener("click", (e) => {
        if (e.target === _dialogContainer) _closeDialog(null);
    });

    // Close on Escape
    document.addEventListener("keydown", _handleKeydown);

    return _dialogContainer;
}

function _handleKeydown(e) {
    if (!_dialogContainer || !_dialogContainer.classList.contains("open")) return;
    if (e.key === "Escape") {
        e.preventDefault();
        _closeDialog(null);
    }
    if (e.key === "Enter") {
        e.preventDefault();
        const input = document.getElementById("dialog-input");
        const inputWrap = document.getElementById("dialog-input-wrap");
        if (inputWrap && inputWrap.style.display !== "none") {
            _closeDialog(input.value);
        } else {
            _closeDialog(true);
        }
    }
}

function _closeDialog(result) {
    if (!_dialogContainer) return;
    _dialogContainer.classList.remove("open");
    setTimeout(() => {
        _dialogContainer.classList.remove("dialog-danger", "dialog-warning", "dialog-info");
    }, 200);
    if (_dialogResolve) {
        _dialogResolve(result);
        _dialogResolve = null;
    }
}

/**
 * Show a confirm dialog (replaces confirm()).
 * @param {Object} options
 * @param {string} options.title - Dialog title
 * @param {string} options.body - Dialog body text
 * @param {string} [options.confirmText="Confirmar"] - Confirm button text
 * @param {string} [options.cancelText="Cancelar"] - Cancel button text
 * @param {"danger"|"warning"|"info"} [options.type="info"] - Dialog type (affects icon & button color)
 * @param {string} [options.icon] - Custom icon HTML (Phosphor icon class)
 * @returns {Promise<boolean>} true if confirmed, false/null if cancelled
 */
export function showConfirm({ title, body, confirmText = "Confirmar", cancelText = "Cancelar", type = "info", icon = null }) {
    return new Promise((resolve) => {
        _dialogResolve = resolve;
        const container = _ensureContainer();

        // Set type class
        container.classList.remove("dialog-danger", "dialog-warning", "dialog-info");
        container.classList.add(`dialog-${type}`);

        // Icon
        const iconEl = document.getElementById("dialog-icon");
        if (icon) {
            iconEl.innerHTML = `<i class="ph ${icon}"></i>`;
            iconEl.style.display = "";
        } else {
            const defaultIcons = {
                danger: "ph-warning-circle",
                warning: "ph-warning",
                info: "ph-info",
            };
            iconEl.innerHTML = `<i class="ph ${defaultIcons[type] || "ph-info"}"></i>`;
            iconEl.style.display = "";
        }

        document.getElementById("dialog-title").textContent = title;
        document.getElementById("dialog-body").textContent = body;
        document.getElementById("dialog-input-wrap").style.display = "none";

        // Buttons
        const btnConfirm = document.getElementById("dialog-btn-confirm");
        const btnCancel = document.getElementById("dialog-btn-cancel");
        btnConfirm.textContent = confirmText;
        btnCancel.textContent = cancelText;

        // Button classes based on type
        btnConfirm.className = "btn dialog-btn-confirm";
        if (type === "danger") btnConfirm.classList.add("btn-danger-solid");
        else btnConfirm.classList.add("btn-primary");

        // Event listeners (fresh each time)
        const newConfirm = btnConfirm.cloneNode(true);
        const newCancel = btnCancel.cloneNode(true);
        btnConfirm.replaceWith(newConfirm);
        btnCancel.replaceWith(newCancel);

        newConfirm.addEventListener("click", () => _closeDialog(true));
        newCancel.addEventListener("click", () => _closeDialog(null));

        // Open
        container.classList.add("open");
    });
}

/**
 * Show a prompt dialog (replaces prompt()).
 * @param {Object} options
 * @param {string} options.title - Dialog title
 * @param {string} [options.body=""] - Dialog body text
 * @param {string} [options.label=""] - Input label
 * @param {string} [options.placeholder=""] - Input placeholder
 * @param {string} [options.inputType="text"] - Input type (text, password, number)
 * @param {string} [options.defaultValue=""] - Default input value
 * @param {string} [options.confirmText="Confirmar"] - Confirm button text
 * @param {"danger"|"warning"|"info"} [options.type="info"] - Dialog type
 * @param {string} [options.icon] - Custom icon HTML
 * @returns {Promise<string|null>} Input value if confirmed, null if cancelled
 */
export function showPrompt({ title, body = "", label = "", placeholder = "", inputType = "text", defaultValue = "", confirmText = "Confirmar", type = "info", icon = null }) {
    return new Promise((resolve) => {
        _dialogResolve = resolve;
        const container = _ensureContainer();

        container.classList.remove("dialog-danger", "dialog-warning", "dialog-info");
        container.classList.add(`dialog-${type}`);

        // Icon
        const iconEl = document.getElementById("dialog-icon");
        if (icon) {
            iconEl.innerHTML = `<i class="ph ${icon}"></i>`;
            iconEl.style.display = "";
        } else {
            iconEl.style.display = "none";
        }

        document.getElementById("dialog-title").textContent = title;
        document.getElementById("dialog-body").textContent = body;

        // Input
        const inputWrap = document.getElementById("dialog-input-wrap");
        const input = document.getElementById("dialog-input");
        const inputLabel = document.getElementById("dialog-input-label");
        inputWrap.style.display = "";
        input.type = inputType;
        input.placeholder = placeholder;
        input.value = defaultValue;
        inputLabel.textContent = label;

        if (inputType === "password") {
            input.style.letterSpacing = "0.3em";
            input.style.textAlign = "center";
            input.style.fontSize = "1.3rem";
        } else {
            input.style.letterSpacing = "";
            input.style.textAlign = "";
            input.style.fontSize = "";
        }

        // Buttons
        const btnConfirm = document.getElementById("dialog-btn-confirm");
        const btnCancel = document.getElementById("dialog-btn-cancel");
        btnConfirm.textContent = confirmText;

        btnConfirm.className = "btn dialog-btn-confirm";
        if (type === "danger") btnConfirm.classList.add("btn-danger-solid");
        else btnConfirm.classList.add("btn-primary");

        const newConfirm = btnConfirm.cloneNode(true);
        const newCancel = btnCancel.cloneNode(true);
        btnConfirm.replaceWith(newConfirm);
        btnCancel.replaceWith(newCancel);

        newConfirm.addEventListener("click", () => _closeDialog(input.value));
        newCancel.addEventListener("click", () => _closeDialog(null));

        // Open and focus
        container.classList.add("open");
        setTimeout(() => input.focus(), 100);
    });
}

/**
 * Show a PIN entry dialog.
 * Convenience wrapper around showPrompt for admin PIN.
 */
export function showPinDialog({ title = "PIN de Administrador", body = "Ingresa el PIN para continuar" } = {}) {
    return showPrompt({
        title,
        body,
        label: "PIN de Administrador",
        placeholder: "••••••",
        inputType: "password",
        confirmText: "Confirmar",
        type: "warning",
        icon: "ph-lock-simple",
    });
}
