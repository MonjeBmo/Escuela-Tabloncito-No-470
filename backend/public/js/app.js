/* ============================================================
   Tabloncito 470 — App JS
   ============================================================ */

$(function () {

  /* ── Sidebar: marcar enlace activo ─────────────────────── */
  const path = window.location.pathname;
  let $active = null;

  // 1. Exact match (covers /cuadros, /cuadros/busqueda, /cuadros/crear, etc.)
  $('.js-nav-link').each(function () {
    if ($(this).attr('href') === path) { $active = $(this); return false; }
  });

  // 2. Most-specific prefix for detail pages (/cuadros/42, /ocr/revision/3)
  if (!$active) {
    let bestLen = 0;
    $('.js-nav-link').each(function () {
      const href = $(this).attr('href') || '';
      if (href.length > 1 && path.startsWith(href + '/') && href.length > bestLen) {
        bestLen = href.length;
        $active = $(this);
      }
    });
  }

  if ($active) {
    $active
      .removeClass('text-slate-600 hover:bg-slate-100 hover:text-slate-900')
      .addClass('bg-blue-50 text-blue-600 font-medium');
  }

  /* ── Sidebar drawer (mobile) ─────────────────────────── */
  const $sidebarEl = $('#sidebar');
  const $sidebarOv = $('#sidebar-overlay');

  function openSidebar() {
    $sidebarEl.addClass('sidebar-open');
    $sidebarOv.addClass('active');
    $('body').addClass('sidebar-open-body');
  }
  function closeSidebar() {
    $sidebarEl.removeClass('sidebar-open');
    $sidebarOv.removeClass('active');
    $('body').removeClass('sidebar-open-body');
  }

  $('#sidebar-toggle').on('click', openSidebar);
  $('#sidebar-close').on('click', closeSidebar);
  $sidebarOv.on('click', closeSidebar);

  // Close drawer when a nav link is tapped (mobile navigation)
  $(document).on('click', '.js-nav-link', function () {
    if (window.innerWidth < 1024) closeSidebar();
  });

  /* ── Toggle contraseña visible (login) ───────────────── */
  $('#toggle-pw').on('click', function () {
    const $inp  = $('#pw-input');
    const $icon = $('#toggle-pw-icon');
    const show  = $inp.attr('type') === 'password';
    $inp.attr('type', show ? 'text' : 'password');
    $icon.toggleClass('bi-eye', !show).toggleClass('bi-eye-slash', show);
  });

  /* ── Confirmaciones SweetAlert2 ─────────────────────────── */
  $(document).on('click', '[data-confirm]', function (e) {
    e.preventDefault();
    const $el   = $(this);
    const msg   = $el.data('confirm') || '¿Está seguro de realizar esta acción?';
    const $form = $el.closest('form');

    Swal.fire({
      title: '¿Confirmar?',
      text: msg,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
    }).then(r => {
      if (r.isConfirmed) {
        if ($form.length) $form.trigger('submit');
        else if ($el.attr('href')) window.location.href = $el.attr('href');
      }
    });
  });

  /* ── Flash auto-dismiss (4 s) ───────────────────────────── */
  const $flash = $('#flash-msg');
  if ($flash.length) {
    setTimeout(() => $flash.fadeOut(300, () => $flash.remove()), 4000);
  }

  /* ── Dropdown menus ─────────────────────────────────────── */
  $(document).on('click', '[data-dd-trigger]', function (e) {
    e.stopPropagation();
    const $menu  = $(this).siblings('[data-dd-menu]');
    const isOpen = $menu.hasClass('open');
    $('[data-dd-menu]').removeClass('open').addClass('closed');
    if (!isOpen) $menu.removeClass('closed').addClass('open');
  });

  $(document).on('click', function () {
    $('[data-dd-menu]').removeClass('open').addClass('closed');
  });

  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
      $('[data-dd-menu]').removeClass('open').addClass('closed');
      closeSidebar();
    }
  });

  /* ── Preview de archivo seleccionado ────────────────────── */
  $(document).on('change', 'input[type="file"]', function () {
    const $prev = $('#file-preview');
    const file  = this.files[0];
    if (file && $prev.length) {
      $prev.text(file.name + ' — ' + (file.size / 1024).toFixed(1) + ' KB');
    }
  });

  /* ── Barras de confianza OCR ────────────────────────────── */
  $('.conf-fill').each(function () {
    const pct   = parseInt($(this).data('pct') || 0);
    const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    $(this).css({ width: pct + '%', background: color });
  });

  /* ── Búsqueda rápida en navbar ──────────────────────────── */
  $('#global-search').on('keydown', function (e) {
    if (e.key === 'Enter') {
      const q = $(this).val().trim();
      if (q) window.location.href = '/cuadros/busqueda?q=' + encodeURIComponent(q);
    }
  });

  /* ── Animación de entrada de página ────────────────────── */
  $('main').addClass('page-enter');

});
