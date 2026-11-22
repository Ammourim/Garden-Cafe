# GARDEN

Landing page estática do GARDEN (HTML, CSS e JavaScript puros).

## Estrutura

```
index.html          Página principal (todas as seções do site)
css/style.css       Estilos, com os tokens do design system Garden Café
js/menu-data.js     Cardápio completo, endereço, horário e WhatsApp (edite preços aqui)
js/main.js          Animações, cardápio interativo, menu mobile e reserva pelo WhatsApp
js/vendor/          GSAP 3.12.5, ScrollTrigger e Lenis 1.1.13 (animações e rolagem suave)
assets/img/         Fotos, logo da flor e ícones do site
system-design/      Levantamento do Instagram (fonte do conteúdo real)
```

### Animações e acessibilidade

- Rolagem suave (Lenis) só em computadores com mouse; no celular a rolagem é a nativa.
- Quem ativa "reduzir movimento" no sistema vê o site completo, sem animações.
- O card do show AdriaNey some sozinho depois de 28/11/2026 e dá lugar a um aviso de próximos eventos (atributo `data-until` em `index.html`).

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
