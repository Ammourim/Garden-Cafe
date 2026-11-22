# GARDEN

Landing page estática do GARDEN (HTML, CSS e JavaScript puros).

## Estrutura

```
index.html      Página principal
css/style.css   Estilos
js/main.js      Scripts
assets/         Imagens, fontes e outros arquivos
```

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
