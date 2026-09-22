/* Secondary confirm dialog — visual match to knowledge-base modal; isolated class names only */
(function () {
  const api = (window.LegalDemo = window.LegalDemo || {});

  const STYLE_ID = 'ld-confirm-styles';
  const ROOT_ID = 'ld-confirm-root';

  const STYLES = [
    '#' + ROOT_ID + '.ld-confirm-backdrop{',
    'position:fixed;inset:0;z-index:10050;display:grid;place-items:center;',
    'padding:18px;background:rgba(27,36,58,.42);box-sizing:border-box;',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-dialog{',
    'width:min(520px,100%);max-height:90vh;overflow:auto;padding:20px;',
    'background:#fff;border-radius:8px;box-shadow:0 18px 44px rgba(18,30,59,.2);',
    'box-sizing:border-box;text-align:left;',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-title{',
    'margin:0 0 7px;font-size:18px;font-weight:700;color:#283044;line-height:1.35;',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-message{',
    'margin:0 0 14px;font-size:14px;line-height:1.6;color:#64748b;word-break:break-word;',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-actions{',
    'display:flex;justify-content:flex-end;gap:7px;margin-top:18px;',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-btn{',
    'font:inherit;cursor:pointer;min-width:72px;padding:7px 14px;border-radius:8px;',
    'transition:background .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease,transform .15s ease;',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-btn-cancel{',
    'color:#7564d8;background:#f4f1ff;border:1px solid #e3dcfa;',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-btn-cancel:hover{',
    'background:#eae4fc;border-color:#d6ccf5;color:#6757c8;',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-btn-ok{',
    'color:#fff;background:linear-gradient(90deg,#6d70ff 0%,#6757c8 100%);border:none;',
    'box-shadow:0 4px 15px rgba(109,112,255,.3);',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-btn-ok:hover{',
    'transform:translateY(-1px);box-shadow:0 6px 20px rgba(109,112,255,.4);',
    '}',
    '#' + ROOT_ID + ' .ld-confirm-btn:focus-visible{',
    'outline:2px solid rgba(109,112,255,.35);outline-offset:2px;',
    '}'
  ].join('');

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  /**
   * @param {string|{ title?: string, message?: string, confirmText?: string, cancelText?: string }} options
   * @returns {Promise<boolean>}
   */
  api.confirm = function confirm(options) {
    const opts =
      typeof options === 'string'
        ? { message: options }
        : options && typeof options === 'object'
          ? options
          : {};
    const title = opts.title || 'Confirm';
    const message = opts.message || '';
    const confirmText = opts.confirmText || 'Confirm';
    const cancelText = opts.cancelText || 'Cancel';

    ensureStyles();

    return new Promise(function (resolve) {
      const prev = document.getElementById(ROOT_ID);
      if (prev) prev.remove();

      const root = document.createElement('div');
      root.id = ROOT_ID;
      root.className = 'ld-confirm-backdrop';
      root.setAttribute('role', 'presentation');
      root.innerHTML = [
        '<section class="ld-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ldConfirmTitle">',
        '<h2 class="ld-confirm-title" id="ldConfirmTitle"></h2>',
        '<p class="ld-confirm-message"></p>',
        '<div class="ld-confirm-actions">',
        '<button type="button" class="ld-confirm-btn ld-confirm-btn-cancel" data-ld-confirm="cancel"></button>',
        '<button type="button" class="ld-confirm-btn ld-confirm-btn-ok" data-ld-confirm="ok"></button>',
        '</div>',
        '</section>'
      ].join('');

      const titleEl = root.querySelector('#ldConfirmTitle');
      const messageEl = root.querySelector('.ld-confirm-message');
      const cancelBtn = root.querySelector('[data-ld-confirm="cancel"]');
      const okBtn = root.querySelector('[data-ld-confirm="ok"]');
      titleEl.textContent = title;
      messageEl.textContent = message;
      cancelBtn.textContent = cancelText;
      okBtn.textContent = confirmText;

      function finish(result) {
        document.removeEventListener('keydown', onKey, true);
        root.remove();
        resolve(result);
      }

      function onKey(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          finish(true);
        }
      }

      root.addEventListener('click', function (event) {
        if (event.target === root) finish(false);
      });
      cancelBtn.addEventListener('click', function () {
        finish(false);
      });
      okBtn.addEventListener('click', function () {
        finish(true);
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(root);
      okBtn.focus();
    });
  };
})();
