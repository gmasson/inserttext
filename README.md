# InsertText
InsertText é uma extensão para Google Chrome que permite salvar blocos de textos e inseri-los onde o cursor estiver no site.

## Funcionalidades
- **Textos:** Salve blocos de textos com título, conteúdo e tags. Faça buscas dinâmicas e insira o texto selecionado onde desejar.
- **Manual:** Insira um texto único manualmente onde o cursor estiver no site.
- **Importar/Exportar:** Exporte todos os textos salvos em um arquivo JSON ou importe textos seguindo a mesma estrutura.

## Estrutura do Projeto
- **popup.html:** Interface principal da extensão com CSS e JavaScript embutidos, contendo as três abas (Textos, Manual, Importar/Exportar) e o formulário para criação/edição de blocos de textos.
- **manifest.json:** Arquivo de manifesto com as configurações, permissões e definições da extensão.
- **README.md:** Documentação do projeto.

## Instalação
1. Clone o repositório:
   ```bash
   git clone https://github.com/gmasson/inserttext.git
   ```
2. Abra o Google Chrome e acesse `chrome://extensions/`.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta do projeto.

## Uso
- **Abrir o popup:** Clique no ícone da extensão para abrir a interface.
- **Textos:** Busque, insira ou edite os blocos de textos salvos.
- **Manual:** Insira um texto único e clique em "Inserir Texto" para aplicá-lo onde o cursor estiver.
- **Importar/Exportar:** Utilize os botões para exportar os textos em um arquivo JSON ou importar textos já salvos.
- **Novo Bloco:** Clique em "Inserir Novo Bloco" para abrir o formulário de cadastro, preencha os campos e clique em "Salvar Bloco".

## Licença
Este projeto está licenciado sob a [Licença MIT](https://opensource.org/licenses/MIT).
