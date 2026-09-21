
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sticky header state
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  updateHeader();
  window.addEventListener('scroll', updateHeader, {passive:true});

  // Mobile navigation
  menuToggle?.addEventListener('click', () => {
    const open = navLinks?.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(!!open));
  });
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => { navLinks?.classList.remove('open'); menuToggle?.setAttribute('aria-expanded','false'); });
  });

  // Reveal-on-scroll
  const reveals = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      });
    }, {threshold:.12});
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('is-visible'));

  // Current year
  document.querySelectorAll('[data-current-year]').forEach(el => el.textContent = new Date().getFullYear());

  // Accessible carousel with swipe support
  const carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    const slides = [...carousel.querySelectorAll('.slide')];
    const dots = [...carousel.querySelectorAll('.carousel-dot')];
    const prev = carousel.querySelector('[data-prev]');
    const next = carousel.querySelector('[data-next]');
    let index = slides.findIndex(s => s.classList.contains('is-active')) || 0;
    let timer;
    let startX = 0;
    let hovering = false;
    const show = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;
      slides.forEach((s,i)=>s.classList.toggle('is-active',i===index));
      dots.forEach((d,i)=>{d.classList.toggle('is-active',i===index); d.setAttribute('aria-selected',String(i===index));});
    };
    const stop = () => { if (timer) clearInterval(timer); timer=null; };
    const start = () => { if (reduceMotion) return; stop(); timer=setInterval(()=>{if(!hovering) show(index+1)},6000); };
    prev?.addEventListener('click',()=>{show(index-1);start()});
    next?.addEventListener('click',()=>{show(index+1);start()});
    dots.forEach((d,i)=>d.addEventListener('click',()=>{show(i);start()}));
    carousel.addEventListener('mouseenter',()=>{hovering=true});
    carousel.addEventListener('mouseleave',()=>{hovering=false});
    carousel.addEventListener('focusin',stop); carousel.addEventListener('focusout',start);
    carousel.addEventListener('touchstart',e=>{startX=e.changedTouches[0].clientX; stop();},{passive:true});
    carousel.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX; if(Math.abs(dx)>45) show(index+(dx<0?1:-1)); start();},{passive:true});
    show(index); start();
  }

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    const button = item.querySelector('.faq-q');
    button?.addEventListener('click',()=>{
      const willOpen=!item.classList.contains('open');
      item.classList.toggle('open',willOpen);
      button.setAttribute('aria-expanded',String(willOpen));
    });
  });

  // Gallery lightbox
  const galleryItems=[...document.querySelectorAll('.gallery-item')];
  const lightbox=document.querySelector('.lightbox');
  if(lightbox && galleryItems.length){
    const image=lightbox.querySelector('img'); const caption=lightbox.querySelector('figcaption');
    let gi=0;
    const open = (i) => {gi=i; const item=galleryItems[gi]; const img=item.querySelector('img'); image.src=img.currentSrc||img.src; image.alt=img.alt; caption.textContent=item.dataset.caption||img.alt; lightbox.classList.add('is-open'); lightbox.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';};
    const close=()=>{lightbox.classList.remove('is-open');lightbox.setAttribute('aria-hidden','true');document.body.style.overflow='';};
    const step=(dir)=>open((gi+dir+galleryItems.length)%galleryItems.length);
    galleryItems.forEach((item,i)=>item.addEventListener('click',()=>open(i)));
    lightbox.querySelector('.lightbox-close')?.addEventListener('click',close);
    lightbox.querySelector('.lightbox-prev')?.addEventListener('click',()=>step(-1));
    lightbox.querySelector('.lightbox-next')?.addEventListener('click',()=>step(1));
    lightbox.addEventListener('click',e=>{if(e.target===lightbox)close()});
    document.addEventListener('keydown',e=>{
      if(!lightbox.classList.contains('is-open')) return;
      if(e.key==='Escape') close(); if(e.key==='ArrowLeft') step(-1); if(e.key==='ArrowRight') step(1);
    });
  }

  // Forms: Web3Forms, with honest setup/error state.
  const formEndpoint = window.GPS_CONFIG?.WEB3FORMS_ENDPOINT || 'https://api.web3forms.com/submit';
  const accessKey = window.GPS_CONFIG?.WEB3FORMS_ACCESS_KEY || '';
  document.querySelectorAll('[data-web3-form]').forEach(form => {
    const result=form.querySelector('.form-status'); const submit=form.querySelector('[type="submit"]');
    if(!result || !submit) return;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (!accessKey || accessKey.includes('YOUR_WEB3FORMS_ACCESS_KEY')) {
        result.className='status show error form-status';
        result.textContent='Online form delivery is not configured yet. Please complete the Web3Forms setup in README.md, or contact the school directly by phone or WhatsApp.';
        return;
      }
      const original=submit.innerHTML; submit.disabled=true; submit.innerHTML='<span>Sending...</span>';
      result.className='status show info form-status'; result.textContent='Sending your enquiry…';
      const data=new FormData(form);
      data.set('access_key',accessKey);
      data.set('replyto', form.querySelector('[name="email"]')?.value || '');
      data.set('botcheck','');
      try{
        const res=await fetch(formEndpoint,{method:'POST',body:data,headers:{'Accept':'application/json'}});
        const json=await res.json().catch(()=>({}));
        if(res.ok && (json.success===true || json.message)){
          result.className='status show success form-status';
          result.textContent=form.dataset.successMessage || 'Thank you! Your message has been submitted successfully.';
          form.reset();
        }else{
          throw new Error(json.message || 'Submission failed');
        }
      }catch(err){
        result.className='status show error form-status';
        result.textContent=form.dataset.errorMessage || 'Something went wrong. Please try again or contact the school directly by phone or WhatsApp.';
      }finally{submit.disabled=false;submit.innerHTML=original;}
    });
  });
});
