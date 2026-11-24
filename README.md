# GARDEN

Landing page estática do GARDEN (HTML, CSS e JavaScript puros).

**Acesse a página:** https://ammourim.github.io/Garden-Cafe/

Publicada pelo GitHub Pages a partir da branch `main`. Cada `git push` na `main` atualiza o site em alguns minutos.

## Estrutura

```
index.html          Página principal (todas as seções do site)
css/style.css       Estilos, com os tokens do design system Garden Café
js/menu-data.js     Cardápio padrão, endereço, horário e WhatsApp (usado se a planilha não carregar)
js/sheet-content.js Lê a planilha do Google com o conteúdo do site (link na constante GARDEN_SHEET_URL)
js/main.js          Animações, cardápio interativo, menu mobile e reserva pelo WhatsApp
js/vendor/          GSAP 3.12.5, ScrollTrigger e Lenis 1.1.13 (animações e rolagem suave)
assets/img/         Fotos, logo da flor e ícones do site
system-design/      Levantamento do Instagram (fonte do conteúdo real)
```

### Animações e acessibilidade

- Rolagem suave (Lenis) só em computadores com mouse; no celular a rolagem é a nativa.
- Quem ativa "reduzir movimento" no sistema vê o site completo, sem animações.
- O card do show AdriaNey some sozinho depois de 28/11/2026 e dá lugar a um aviso de próximos eventos (atributo `data-until` em `index.html`).

## Conteúdo pela planilha do Google

O dono do café atualiza o site sem mexer no código, pela planilha
[Garden Café · Conteúdo do site](https://docs.google.com/spreadsheets/d/1eW5U0vxoKb55iv8mbDSVy7ySJPkYn2rrH31pfQhzKd8/edit).
A aba "Instruções" explica tudo para quem vai editar.

- Abas lidas pelo site: Cardápio, Categorias, Destaques, Eventos, Sugestão do dia e Promoções.
- O site lê cada aba como CSV (endpoint `gviz` do Google) ao abrir a página. A planilha precisa estar
  compartilhada como "Qualquer pessoa com o link: Leitor".
- A última versão lida fica salva no navegador do visitante, então a próxima visita já abre com ela.
- Se a planilha não responder, o site usa o conteúdo padrão de `js/menu-data.js` e do `index.html`.
- Para usar outra planilha, troque só a constante `GARDEN_SHEET_URL` em `js/sheet-content.js`.
- Links de fotos do Google Drive são convertidos para link direto automaticamente.
- Cardápio: a coluna "Imagem" da aba Cardápio define a foto de cada item. No computador, a foto ao lado da lista troca ao passar o mouse no item; no celular, o item mostra uma miniatura e abre a foto ao tocar. Sem foto, vale a foto da categoria (aba Categorias).

## Como abrir a página localmente

Opção simples: dê dois cliques em `index.html` para abrir no navegador.

Opção com servidor local (recomendado quando houver scripts ou fontes):

- **VS Code:** instale a extensão "Live Server", clique com o botão direito em `index.html` e escolha "Open with Live Server".
- **Python:** na pasta do projeto, rode `python -m http.server 8000` e abra http://localhost:8000

## Primeira vez em cada PC

```bash
git clone https://github.com/Ammourim/Garden-Cafe.git
cd Garden-Cafe
```

## Rotina para alternar entre o PC do trabalho e o de casa

**Ao começar a trabalhar** (sempre, antes de editar qualquer coisa):

```bash
git pull
```

**Ao terminar** (antes de desligar ou trocar de PC):

```bash
git add .
git commit -m "Descreva o que mudou"
git push
```

Se esquecer o `git push` em um PC, as alterações ficam só nele. Se esquecer o `git pull`, você trabalha numa versão desatualizada e pode gerar conflitos.
