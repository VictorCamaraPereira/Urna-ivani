const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const db = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};
let chapas = db.get('chapas', [null, null]);
let votos = db.get('votos', []);
let senha = db.get('senha', '1234');
let rascunho = JSON.parse(JSON.stringify(chapas));

let ac;
function tirlili() {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  const nota = (f, ini, dur, tipo = 'square') => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, ac.currentTime + ini);
    g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + ini + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ini + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(ac.currentTime + ini); o.stop(ac.currentTime + ini + dur + 0.02);
  };
  const fs = [1568, 2093];
  for (let i = 0; i < 14; i++) nota(fs[i % 2], i * 0.055, 0.05);
  nota(2349, 14 * 0.055, 0.55);
}
function bip() {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.value = 900; g.gain.value = 0.1;
  o.connect(g); g.connect(ac.destination);
  o.start(); o.stop(ac.currentTime + 0.05);
}

function pedirSenha() { return prompt('Senha do mesário:') === senha; }
$$('nav button').forEach(b => b.onclick = () => {
  const v = b.dataset.v;
  if (v !== 'urna' && !pedirSenha()) return alert('Senha incorreta.');
  $$('nav button').forEach(x => x.classList.toggle('on', x === b));
  $$('.view').forEach(x => x.classList.toggle('on', x.id === v));
  if (v === 'cadastro') desenhaCadastro();
  if (v === 'resultado') desenhaResultado();
  if (v === 'urna') resetUrna();
});

function desenhaCadastro() {
  $$('.card').forEach(card => {
    const i = +card.dataset.i, c = rascunho[i] || {};
    card.innerHTML = `
      <h3>Chapa ${i + 1}</h3>
      <label>Número (2 dígitos)</label><input type="text" maxlength="2" data-f="numero" value="${c.numero || ''}">
      <label>Nome da chapa</label><input type="text" data-f="nome" value="${c.nome || ''}">
      <label>Lema / integrantes</label><input type="text" data-f="lema" value="${c.lema || ''}">
      <label>Imagem</label><input type="file" accept="image/*" data-f="img">
      ${c.img ? `<img src="${c.img}" alt="">` : ''}`;
    $$('input[type=text]', card).forEach(inp => inp.oninput = () => {
      rascunho[i] = rascunho[i] || {};
      rascunho[i][inp.dataset.f] = inp.value;
    });
    $('input[type=file]', card).onchange = e => lerImagem(e.target.files[0], i);
  });
}
function lerImagem(file, i) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const m = 320, esc = Math.min(1, m / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = im.width * esc; c.height = im.height * esc;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      rascunho[i] = rascunho[i] || {};
      rascunho[i].img = c.toDataURL('image/jpeg', 0.8);
      desenhaCadastro();
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}
$('#salvar').onclick = () => {
  const msg = $('#msg');
  const ok = rascunho.every(c => c && /^\d{2}$/.test(c.numero || '') && (c.nome || '').trim() && c.img);
  if (!ok) { msg.textContent = '⚠️ Preencha número (2 dígitos), nome e imagem das duas chapas.'; return; }
  if (rascunho[0].numero === rascunho[1].numero) { msg.textContent = '⚠️ As chapas precisam ter números diferentes.'; return; }
  chapas = JSON.parse(JSON.stringify(rascunho));
  db.set('chapas', chapas);
  msg.textContent = '✅ Chapas salvas!';
};
$('#trocaSenha').onclick = () => {
  const n = prompt('Nova senha do mesário:');
  if (n && n.length >= 4) { senha = n; db.set('senha', n); alert('Senha alterada.'); }
  else if (n !== null) alert('Use pelo menos 4 caracteres.');
};

function desenhaResultado() {
  const total = votos.length;
  const cont = k => votos.filter(v => v === k).length;
  const linhas = chapas.filter(Boolean).map(c => [`${c.nome} (${c.numero})`, cont(c.numero)]);
  linhas.push(['Brancos', cont('BRANCO')], ['Nulos', cont('NULO')]);
  $('#res').innerHTML = `<p>Total de votos: <b>${total}</b></p>` + linhas.map(([n, q]) => {
    const p = total ? (q / total * 100) : 0;
    return `<div class="bar"><div style="width:${Math.max(p, 12)}%">${n}: ${q} (${p.toFixed(1)}%)</div></div>`;
  }).join('');
}
$('#atualiza').onclick = desenhaResultado;
$('#zera').onclick = () => {
  if (confirm('Apagar TODOS os votos? Não dá para desfazer.')) { votos = []; db.set('votos', votos); desenhaResultado(); }
};

let digitos = '', branco = false, fim = false;
const tela = $('#tela');
for (const n of [1,2,3,4,5,6,7,8,9,0]) {
  const b = document.createElement('button');
  b.className = 'k'; b.textContent = n; b.onclick = () => tecla(String(n));
  $('#teclado').appendChild(b);
}
$$('.acoes .k').forEach(b => b.onclick = () => acao(b.dataset.a));

function resetUrna() { digitos = ''; branco = false; fim = false; desenhaUrna(); }
function achar() { return chapas.find(c => c && c.numero === digitos); }

function desenhaUrna() {
  if (!chapas[0] || !chapas[1]) {
    tela.innerHTML = '<div class="aviso">Urna não configurada.<br>Cadastre as 2 chapas na aba "Cadastro de chapas".</div>';
    return;
  }
  if (fim) { tela.innerHTML = '<div class="fim">FIM</div><div class="rodape" style="text-align:center">VOTOU</div>'; return; }
  let corpo = '';
  const box = [0, 1].map(i => `<div class="dig ${!branco && digitos.length === i ? 'at' : ''}">${branco ? '' : (digitos[i] || '')}</div>`).join('');
  if (branco) {
    corpo = '<div class="aviso">VOTO EM BRANCO</div>';
  } else if (digitos.length === 2) {
    const c = achar();
    corpo = c
      ? `<div class="info"><img src="${c.img}" alt=""><div class="t"><b>Chapa:</b> ${c.nome}<br><b>Lema:</b> ${c.lema || '—'}</div></div>`
      : '<div class="aviso">NÚMERO ERRADO<br>VOTO NULO</div>';
  }
  tela.innerHTML = `<h3>SEU VOTO PARA<br>REPRESENTANTES DA ESCOLA</h3>
    <div class="digitos">${box}</div>${corpo}
    <div class="rodape">Aperte a tecla:<br>VERDE para CONFIRMAR este voto<br>LARANJA para REINICIAR este voto</div>`;
}
function tecla(n) {
  if (fim || branco || !chapas[0] || !chapas[1] || digitos.length >= 2) return;
  digitos += n; bip(); desenhaUrna();
}
function acao(a) {
  if (fim || !chapas[0] || !chapas[1]) return;
  if (a === 'corrige') { digitos = ''; branco = false; }
  if (a === 'branco') { digitos = ''; branco = true; }
  if (a === 'confirma') {
    let voto = null;
    if (branco) voto = 'BRANCO';
    else if (digitos.length === 2) voto = achar() ? digitos : 'NULO';
    if (!voto) return;
    votos.push(voto); db.set('votos', votos);
    fim = true; tirlili(); desenhaUrna();
    setTimeout(resetUrna, 3000);
    return;
  }
  desenhaUrna();
}
document.addEventListener('keydown', e => {
  if (!$('#urna').classList.contains('on')) return;
  if (/^\d$/.test(e.key)) tecla(e.key);
  else if (e.key === 'Backspace') acao('corrige');
  else if (e.key.toLowerCase() === 'b') acao('branco');
  else if (e.key === 'Enter') acao('confirma');
});
desenhaUrna();
