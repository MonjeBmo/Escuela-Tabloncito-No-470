/* ============================================================
   Escuela El Tabloncito No. 470 — JavaScript de cliente
   ============================================================ */

$(function () {

  // ── Select2 en todos los selects marcados ────────────────
  $('select[data-select2]').select2({
    theme: 'bootstrap-5',
    width: '100%',
    placeholder: $(this).data('placeholder') || 'Seleccione...',
    allowClear: true,
  });

  // ── Confirmaciones SweetAlert2 ───────────────────────────
  $('[data-confirm]').on('click', function (e) {
    e.preventDefault();
    const $el = $(this);
    const mensaje = $el.data('confirm') || '¿Está seguro de realizar esta acción?';
    const form = $el.closest('form');

    Swal.fire({
      title: '¿Confirmar acción?',
      text: mensaje,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1d6fc4',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        if (form.length) {
          form.trigger('submit');
        } else if ($el.attr('href')) {
          window.location.href = $el.attr('href');
        }
      }
    });
  });

  // ── Auto-dismiss alertas flash ───────────────────────────
  setTimeout(function () {
    $('.flash-alert').fadeOut(400);
  }, 5000);

  // ── Sidebar: marcar enlace activo ────────────────────────
  const path = window.location.pathname.split('/')[1];
  $('.nav-item-sidebar').each(function () {
    const href = $(this).attr('href') || '';
    if (href && href.includes('/' + path) && path !== '') {
      $(this).addClass('active');
    }
  });

  // ── Preview de archivo seleccionado ─────────────────────
  $('input[type="file"]').on('change', function () {
    const $preview = $('#file-preview');
    const file = this.files[0];
    if (file && $preview.length) {
      $preview.text(file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)');
    }
  });

  // ── Barras de confianza OCR ──────────────────────────────
  $('.confidence-fill').each(function () {
    const pct = parseInt($(this).data('pct') || 0);
    $(this).css('width', pct + '%');
    if (pct < 50) $(this).addClass('low');
    else if (pct < 80) $(this).addClass('medium');
  });

  // ── Tooltips Bootstrap ────────────────────────────────────
  const tooltipEls = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipEls.forEach(el => new bootstrap.Tooltip(el));

});
