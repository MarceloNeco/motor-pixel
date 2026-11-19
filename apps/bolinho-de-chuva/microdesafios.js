/* Exemplo de referência: rodízio de microdesafios (Peluqueria 2.0).
   Cada desafio é um objeto { id, iniciar(ctx) -> Promise<{acertou, pontos}> }.
   O rodízio sorteia sem repetir seguido, insere bônus a cada 3 e termina com o Cliente VIP. */

export function criarRodizio({ desafios, nivel = 'normal', totalRodadas = 9, aoMudarHumor, aoTerminar }) {
  const vel = { kids: 0.7, normal: 1, crazy: 1.4 }[nivel] || 1;
  let ultimo = null;
  let pontos = 0;
  let humor = 0.5;          // 0 = bravo, 1 = apaixonado

  function sortear() {
    const opcoes = desafios.filter((d) => d.id !== ultimo);
    const d = opcoes[Math.floor(Math.random() * opcoes.length)];
    ultimo = d.id;
    return d;
  }

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  async function jogar(ctx) {
    for (let rodada = 1; rodada <= totalRodadas; rodada++) {
      const vip = rodada === totalRodadas;
      const bonus = !vip && rodada % 3 === 0;
      const desafio = sortear();
      ctx.anunciar({ rodada, total: totalRodadas, desafio: desafio.id, bonus, vip });   // texto curto + ícone
      await esperar(1000);                                                              // transição automática
      const r = await desafio.iniciar({ ...ctx, velocidade: vel, bonus, vip });
      const mult = vip ? 2 : bonus ? 1.5 : 1;
      if (r.acertou) {
        pontos += Math.round(r.pontos * mult);
        humor = Math.min(1, humor + 0.12);
        ctx.reagir('feliz');
      } else {
        humor = Math.max(0, humor - 0.08);
        ctx.reagir('ops');
      }
      aoMudarHumor?.(humor);
    }
    aoTerminar?.({ pontos, humor, estrelas: humor > 0.85 ? 3 : humor > 0.6 ? 2 : 1 });
  }

  return { jogar };
}

/* Exemplo de um desafio: "Encaixe na hora" (o atual, melhorado). */
export const encaixe = {
  id: 'encaixe',
  iniciar(ctx) {
    return new Promise((resolve) => {
      const duracao = 2400 / ctx.velocidade;
      const inicio = performance.now();
      const alvoY = ctx.alturaDoAlvo;               // onde o acessório deve parar (px)
      const acessorio = ctx.mostrarAcessorio();      // devolve um objeto com .y e .esconder()
      function passo(t) {
        const k = ((t - inicio) % duracao) / duracao;
        acessorio.y = k * ctx.alturaTela;
        if (!fim) requestAnimationFrame(passo);
      }
      let fim = false;
      requestAnimationFrame(passo);
      ctx.aoTocar(() => {
        fim = true;
        const erro = Math.abs(acessorio.y - alvoY);
        const acertou = erro < 40;
        ctx.efeitoEncaixe(acertou);                  // "plop", brilho, sombra aparece
        resolve({ acertou, pontos: Math.max(0, 100 - Math.round(erro)) });
      });
    });
  },
};
