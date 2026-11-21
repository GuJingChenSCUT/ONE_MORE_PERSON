(() => {
  'use strict';
  const slides = Array.from(document.querySelectorAll('.slide'));
  const page = document.getElementById('page-count');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const languageButton = document.getElementById('language');
  const relayButton = document.getElementById('show-relay');
  let language = 'en';
  try { if (localStorage.getItem('omp-pitch-language') === 'zh') language = 'zh'; } catch {}
  let current = Math.max(0, Math.min(slides.length - 1, Number(location.hash.match(/^#story-(\d+)$/)?.[1] || 1) - 1));
  let exchanged = false;

  function renderRelay() {
    const names = language === 'zh' ? ['小林', '小陈', '小雨', '空位'] : ['Alice', 'Bob', 'Charlie', 'Empty'];
    const holders = exchanged ? [2, 0, 1] : [0, 1, 3];
    holders.forEach((holder, index) => {
      document.getElementById(`holder-${index + 1}`).textContent = names[holder];
      document.getElementById(`avatar-${index + 1}`).textContent = holder === 3 ? '+' : language === 'zh' ? names[holder].slice(-1) : names[holder][0];
    });
    document.getElementById('seat-3').classList.toggle('empty', !exchanged);
    document.getElementById('relay-state').textContent = language === 'zh'
      ? exchanged ? '小雨接上上午。三个席位，现在三人参加。' : '小雨在候补。现在两个人已有席位。'
      : exchanged ? 'Charlie gets morning. Three seats now serve three people.' : 'Charlie is waiting. Two people have seats.';
    relayButton.textContent = language === 'zh' ? exchanged ? '查看原位' : '看看这次接力' : exchanged ? 'Show original seats' : 'Show the relay';
    relayButton.setAttribute('aria-pressed', String(exchanged));
  }

  function translate() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = language === 'zh' ? '多一个人 · 项目介绍' : 'One More Person · The pitch';
    document.querySelectorAll('[data-en][data-zh]').forEach(element => { element.textContent = element.dataset[language]; });
    languageButton.textContent = language === 'en' ? '中文' : 'English';
    languageButton.setAttribute('aria-label', language === 'en' ? 'Switch to Chinese' : '切换至英文');
    document.getElementById('chair-title').textContent = language === 'zh' ? '三张连接起来的工作坊席位，示意条件换位。' : 'Three connected workshop seats. An illustration of a conditional exchange.';
    document.querySelector('.seat-map').setAttribute('aria-label', language === 'zh' ? '虚构席位换位例子' : 'Fictional seat exchange example');
    document.querySelector('.presenter-controls').setAttribute('aria-label', language === 'zh' ? '演示翻页控制' : 'Presentation controls');
    document.querySelector('.chapters').setAttribute('aria-label', language === 'zh' ? '演示章节' : 'Presentation sections');
    renderRelay();
  }

  function showSlide(index, focus = false) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    document.querySelectorAll('.chapters [data-go]').forEach(button => {
      if (Number(button.dataset.go) === current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    page.textContent = `${current + 1} / ${slides.length}`;
    history.replaceState(null, '', `#story-${current + 1}`);
    if (focus) {
      slides[current].querySelector('h1,h2').focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showSlide(Number(button.dataset.go), true)));
  previous.addEventListener('click', () => showSlide(current - 1, true));
  next.addEventListener('click', () => showSlide(current + 1, true));
  languageButton.addEventListener('click', () => {
    language = language === 'en' ? 'zh' : 'en';
    try { localStorage.setItem('omp-pitch-language', language); } catch {}
    translate();
  });
  relayButton.addEventListener('click', () => { exchanged = !exchanged; renderRelay(); });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); showSlide(current + 1, true); }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); showSlide(current - 1, true); }
    if (event.key === 'Home') { event.preventDefault(); showSlide(0, true); }
    if (event.key === 'End') { event.preventDefault(); showSlide(slides.length - 1, true); }
  });
  window.addEventListener('hashchange', () => {
    const index = Number(location.hash.match(/^#story-(\d+)$/)?.[1] || 1) - 1;
    showSlide(index, true);
  });
  document.documentElement.classList.add('is-enhanced');
  translate();
  showSlide(current);
})();
