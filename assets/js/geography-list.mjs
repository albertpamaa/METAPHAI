const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
for(const root of document.querySelectorAll('[data-geo-list]')){
  const search=root.querySelector('[data-geo-list-search]'),continent=root.querySelector('[data-geo-continent]'),items=[...root.querySelectorAll('[data-geo-list-item]')],empty=root.querySelector('[data-geo-list-empty]');
  const update=()=>{const query=fold(search?.value),selected=continent?.value||'';let visible=0;for(const item of items){const show=(!query||fold(item.dataset.search).includes(query))&&(!selected||(item.dataset.continents||'').split(' ').includes(selected));item.hidden=!show;if(show)visible++}if(empty)empty.hidden=visible!==0};
  search?.addEventListener('input',update);continent?.addEventListener('change',update);
}
