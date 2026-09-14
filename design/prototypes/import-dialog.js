/*
  "서버로 올리기" popup (사용자 지시 2026-09-14: 화면 위쪽 안내 문구는 잘 안 보여서 팝업으로).

  After signing in, once both the journals (journal-store.js) and the Future
  Item board (future-sync.js) have arrived from the server, if this browser
  still holds signed-out data the server doesn't have, one dialog offers to
  upload both. "나중에" closes it for this tab session; it comes back on a
  later visit. Uploading never deletes the browser's own copy and never
  overwrites a different journal already on the server.
*/
(() => {
  const { auth, journalStore: journals, futureSync: future, ui: { toast } } = window.PhiBrain;
  const dialog = document.querySelector('#import-dialog');
  const countsEl = dialog.querySelector('#import-counts');
  const uploadBtn = dialog.querySelector('#import-upload'), laterBtn = dialog.querySelector('#import-later');
  const DISMISS_KEY = 'phi-brain:import-dismissed';
  const session = {
    get: () => { try { return sessionStorage.getItem(DISMISS_KEY); } catch { return null; } },
    set: () => { try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {} },
  };

  let busy = false;
  const candidates = () => ({ journals: journals.importCandidates().upload.length, future: future.importCandidates().length });

  function maybeOpen() {
    if (dialog.open || busy || !auth.session || session.get()) return;
    if (!journals.loaded || !future.loaded) return;
    const c = candidates();
    if (!c.journals && !c.future) return;
    countsEl.innerHTML = [c.journals ? `<li>저널 <b>${c.journals}개</b></li>` : '', c.future ? `<li>Future Item <b>${c.future}개</b></li>` : ''].join('');
    uploadBtn.disabled = false;
    uploadBtn.textContent = '서버로 올리기';
    dialog.showModal();
    uploadBtn.focus();
  }

  laterBtn.addEventListener('click', () => { session.set(); dialog.close(); });
  dialog.addEventListener('cancel', () => session.set()); // Esc = 나중에
  dialog.addEventListener('click', e => { if (e.target === dialog && !busy) { session.set(); dialog.close(); } }); // backdrop

  uploadBtn.addEventListener('click', async () => {
    busy = true;
    uploadBtn.disabled = true;
    uploadBtn.textContent = '올리는 중…';
    const c = candidates();
    const parts = [];
    let failed = false;
    if (c.future) parts.push(`Future Item ${future.importLocal()}개`);
    if (c.journals) {
      const r = await journals.importLocal();
      parts.push(`저널 ${r.imported.length}개`);
      if (r.conflicts.length) parts.push(`같은 날짜에 다른 내용이 있는 저널 ${r.conflicts.length}개는 건너뛰었어요`);
      if (r.failed.length) { parts.push(`저널 ${r.failed.length}개는 올리지 못했어요`); failed = true; }
    }
    busy = false;
    dialog.close();
    toast(`서버로 올렸어요 · ${parts.join(' · ')}`, null, failed ? 'error' : '');
  });

  journals.onChange(maybeOpen);
  document.addEventListener('phibrain:future-changed', maybeOpen);
  auth.onChange(s => { if (!s && dialog.open) dialog.close(); });
})();
