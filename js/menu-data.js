/*
 * Cardápio do Garden Café.
 * Fonte: PDF do cardápio (link da bio do Instagram), transcrito em
 * system-design/instagram-garden-cafe/README.md (22/11/2026).
 * Conteúdo padrão: o site usa a planilha do Google (js/sheet-content.js) e só cai aqui se ela não carregar.
 * "p" = preço, "v" = variações, "b" = selo, "img" = foto do item (sem foto, usa a da categoria).
 */
window.GARDEN_INFO = {
  address: 'Rua Doutor Gustavo Pinto, 393',
  district: 'Jardim São Paulo, Recife – PE',
  cep: '50781-740',
  hours: 'Todos os dias, das 15h às 22h',
  whatsapp: '5581979003779',
  whatsappLabel: '(81) 97900-3779',
  eventsPhone: '5581986059740',
  eventsPhoneLabel: '(81) 98605-9740',
  instagram: 'gardencafepe',
  facebook: 'gardencaferecife',
  maps: 'https://www.google.com/maps/search/?api=1&query=Garden+Caf%C3%A9+Rua+Doutor+Gustavo+Pinto+393+Jardim+S%C3%A3o+Paulo+Recife'
};

window.GARDEN_MENU = [
  {
    id: 'cuscuz', label: 'Cuscuz', img: 'cuscuz-doce', cap: 'Cabeleira do Zezé',
    items: [
      { n: 'Cuscuz do Sr. Biu', d: 'Cupim acebolado e queijo manteiga', p: 29 },
      { n: 'Lula Vassoureiro', d: 'Carne de sol desfiada na manteiga de garrafa, queijo coalho, coberto com requeijão', p: 27 },
      { n: 'Nuca dos Leões', d: 'Creme de camarão, finalizado com queijo maçaricado', p: 33 },
      { n: 'Lampião e Maria Bonita', d: 'Queijo do reino e goiabada', p: 29 },
      { n: 'J. Borges', d: 'Cuscuz na manteiga coberto com creme de queijo', p: 19 },
      { n: 'Chamego', d: 'Acompanha calabresa acebolada e queijo coalho', p: 22 },
      { n: 'Vitalino', d: 'Frango coberto com requeijão', p: 23 },
      { n: 'Ana das Carrancas', d: 'Carne seca na manteiga de garrafa, queijo coalho e banana frita, finalizado com canela e leite condensado', p: 27 },
      { n: 'Zé Lopes', d: 'Queijo coalho coberto com charque na manteiga de garrafa', p: 23 },
      { n: 'Ladeira de Olinda', d: 'Massa com verduras, coentro, cebola e tomate, recheio de calabresa', p: 19 },
      { n: 'Nena Queiroga', d: 'Queijo muçarela, acompanha guisado de costela, chips de batata-doce e ovo frito', p: 33 },
      { n: 'Cabeleira do Zezé', d: 'Doce de leite, queijo manteiga e banana caramelizada, coberto com doce de leite e fios de casca de banana frita', p: 29, img: 'cuscuz-doce' }
    ]
  },
  {
    id: 'tapiocas', label: 'Tapiocas', img: 'bolo-de-rolo', cap: 'Sabores daqui',
    groups: [
      {
        t: 'Salgadas', items: [
          { n: 'Cais do Sertão', d: 'Carne de sol na manteiga de garrafa e queijo coalho', p: 25 },
          { n: 'Abolição', d: 'Queijo do reino', p: 23 },
          { n: 'Homem do Nordeste', d: 'Charque e creme de queijo da casa', p: 25 },
          { n: 'Paço do Frevo', d: 'Frango desfiado na manteiga de garrafa, tomate seco e queijo muçarela', p: 20 },
          { n: 'Museu do Forró', d: 'Queijo coalho e coco fresco', p: 19 },
          { n: 'Museu do Cangaço', d: 'Coco', p: 15 },
          { n: 'Museu do Mamulengo', d: 'Queijo coalho', p: 15 },
          { n: 'Parque das Esculturas', d: 'Queijo coalho e carne de charque', p: 25 },
          { n: 'Tapioca Núbia Robalinho', d: 'Queijo coalho, queijo manteiga e creme de queijo da casa', p: 25, b: 'Lançamento' }
        ]
      },
      {
        t: 'Doces', items: [
          { n: 'Do Sertão', d: 'Queijo coalho, coco e leite condensado', p: 22 },
          { n: 'Cidade do Recife', d: 'Coco e brigadeiro', p: 20 },
          { n: 'Cidade de Olinda', d: 'Queijo manteiga e banana frita, finalizada com leite condensado e canela', p: 25 },
          { n: 'Casa dos Bonecos Gigantes', d: 'Coco e brigadeiro com amêndoas laminadas', p: 23 },
          { n: 'Do Estado', d: 'Cocada da casa, queijo coalho, coco queimado', p: 25 },
          { n: 'Instituto Ricardo Brennand', d: 'Goiabada e queijo coalho', p: 20 },
          { n: 'Mulher Rendeira', d: 'Coco, queijo coalho e mel de engenho', p: 20 }
        ]
      }
    ]
  },
  {
    id: 'crepiocas', label: 'Crepiocas', img: 'bolo-de-rolo', cap: 'Monte a sua',
    note: 'Monte a sua: 1 item do grupo A + 1 do grupo B + molho.',
    items: [
      { n: 'Crepioca', d: 'Grupo A: carne de sol, carne de charque, frango ou cupim. Grupo B: creme de queijo, muçarela, ricota, queijo coalho ou queijo manteiga. Molho: mostarda e mel ou maionese da casa.', p: 25 },
      { n: 'Crepioca com camarão', d: 'Camarão + 1 item do grupo B + molho', p: 28 }
    ]
  },
  {
    id: 'caldos', label: 'Caldos', img: 'fachada', cap: 'Nosso cantinho',
    note: 'Porção grande 500 ml ou “Tiquinho” 250 ml.',
    items: [
      { n: 'Rio Capibaribe', d: 'Legumes com frango desfiado', v: [['500 ml', 25], ['Tiquinho', 18]] },
      { n: 'Rio São Francisco', d: 'Caldo verde', v: [['500 ml', 25], ['Tiquinho', 18]] },
      { n: 'Rio Ipojuca', d: 'Macaxeira com carne de sol e cubos de queijo coalho', v: [['500 ml', 25], ['Tiquinho', 18]] },
      { n: 'Rio Sirinhaém', d: 'Jerimum com charque e cubos de queijo coalho', v: [['500 ml', 25], ['Tiquinho', 18]] },
      { n: 'Rio Tejipió', d: 'Legumes com carne seca', v: [['500 ml', 25], ['Tiquinho', 18]] },
      { n: 'Rio Beberibe', d: 'Macaxeira com camarão e cubos de queijo coalho', v: [['500 ml', 29], ['Tiquinho', 21]] },
      { n: 'Rio Pajeú', d: 'Jerimum com camarão e cubos de queijo coalho', v: [['500 ml', 29], ['Tiquinho', 21]] }
    ]
  },
  {
    id: 'croissants', label: 'Croissants', img: 'croissant', cap: 'Croissant de domingo',
    groups: [
      {
        t: 'Salgados', items: [
          { n: 'Sossego', d: 'Charque e molho de queijo da casa', p: 33 },
          { n: 'Pina', d: 'Salpicão', p: 33 },
          { n: 'Porto de Galinhas', d: 'Queijo do reino', p: 33 },
          { n: 'Boa Viagem', d: 'Queijo brie e parma', p: 33 },
          { n: 'Calhetas', d: 'Camarão e molho de queijo da casa', p: 39 },
          { n: 'Serrambi', d: 'Cupim, cebola caramelizada e creme de queijo', p: 35 },
          { n: 'Praia do Janga', d: 'Frango desfiado', p: 26 },
          { n: 'Misto', d: 'Presunto e queijo', p: 26 },
          { n: 'Adriano Cabral', d: 'Finalizado com queijo do reino', p: 39 }
        ]
      },
      {
        t: 'Doces', items: [
          { n: 'Maracaípe', d: 'Brigadeiro preto finalizado com morango', p: 35 },
          { n: 'Candeias', d: 'Chocolate branco e geleia de frutas vermelhas', p: 33 },
          { n: 'Coroa do Avião', d: 'Chocolate branco e amêndoas', p: 28 },
          { n: 'Sancho', d: 'Goiabada e queijo coalho', p: 26 },
          { n: 'Jardim São Paulo', d: 'Brigadeiro de chocolate e banana caramelizada', p: 29 },
          { n: 'Santo Aleixo', d: 'Nutella e amêndoas', p: 33 }
        ]
      }
    ]
  },
  {
    id: 'sanduiches', label: 'Sanduíches', img: 'quiche-camarao', cap: 'Feito na hora',
    groups: [
      {
        t: 'Pão ciabatta', items: [
          { n: 'Xote', d: 'Cupim, cebola caramelizada, creme de queijo e alface', p: 28 },
          { n: 'Xaxado', d: 'Frango com milho, verduras, molho especial e alface', p: 29 },
          { n: 'Baião', d: 'Salpicão', p: 28 },
          { n: 'Carimbó', d: 'Molho de mostarda, carne guisada desfiada, queijo muçarela, finalizado com cebola caramelizada e salada', p: 35 },
          { n: 'Forró', d: 'Queijo do reino', p: 29 },
          { n: 'Baque Solto', d: 'Camarão e queijo da casa', p: 37 },
          { n: 'Baque Virado', d: 'Carne de charque com molho de queijo', p: 28 },
          { n: 'Trio Nordestino', d: 'Cupim, carne de charque, carne de sol e queijo cheddar', p: 35 }
        ]
      },
      {
        t: 'Pão italiano', items: [
          { n: 'Pão Pernambucano', d: 'Charque, creme de queijo coalho, finalizado com queijo coalho maçaricado', p: 39 },
          { n: 'Pão Nordestino', d: 'Creme de camarões e molho de queijo da casa', p: 45 }
        ]
      },
      {
        t: 'Pão de forma', items: [
          { n: 'Chico Science', d: 'Pão na manteiga com ovo frito, bacon e salada', p: 19 },
          { n: 'Sanduíche Gratinado', d: 'Queijo muçarela, presunto e molho de tomate', p: 19 }
        ]
      },
      {
        t: 'Pão francês', items: [
          { n: 'Frevo', d: 'Carne de charque desfiada e salada', p: 18 },
          { n: 'Bumba Meu Boi', d: 'Salpicão, salada e toque de mel', p: 18 },
          { n: 'Papangu', d: 'Carne de cupim e cebola caramelizada' },
          { n: 'Caboclinho', d: 'Carne de sol, queijo coalho e salada', p: 18 },
          { n: 'Recife', d: 'Queijo coalho e ovo frito', p: 14 }
        ]
      }
    ]
  },
  {
    id: 'hamburgueres', label: 'Hambúrgueres', img: 'fachada', cap: 'Nosso cantinho',
    items: [
      { n: 'Bloco Mamãe eu Quero', d: 'Carne artesanal 100 g, queijo muçarela, tomate e alface', p: 20 },
      { n: 'Bloco O Bonde', d: 'Carne especial 150 g, creme de queijo, bacon, tomate e alface', p: 25 },
      { n: 'Bloco Galo da Madrugada', d: 'Carne artesanal 150 g, ovos, queijo muçarela, tomate, alface e maionese da casa', p: 25 },
      { n: 'Bloco das Flores', d: 'Carne artesanal 150 g, cheddar ou muçarela, anéis de cebola, tomate, alface e maionese da casa', p: 29 },
      { n: 'Bloco da Saudade', d: 'Carne artesanal especial 150 g, queijo coalho, ovos, cebola caramelizada, fritas, tomate e alface', p: 35 },
      { n: 'Bloco Homem da Meia Noite', d: 'Carne artesanal, charque e toscana 150 g, queijo manteiga, cebola no creme de mostarda verde, tomate e alface', p: 39 },
      { n: 'Bloco Pitombeira', d: 'Carne artesanal, charque e toscana 150 g, queijo manteiga, cebola no creme de mostarda verde, tomate, alface, maionese da casa e batata frita', p: 45 },
      { n: '+ Porção extra de fritas', d: '150 g', p: 10 },
      { n: '+ Copo de suco de polpa', d: '', p: 10 }
    ]
  },
  {
    id: 'especiais', label: 'Especiais', img: 'cuscuz-doce', cap: 'Comida arretada',
    groups: [
      {
        t: 'Especiais', items: [
          { n: 'Maracatu', d: 'Macaxeira com carne de sol e queijo coalho em cubos + creme de queijo', v: [['1 pessoa', 28], ['2 pessoas', 55]] },
          { n: 'Alto do Moura', d: 'Escondidinho de batata-doce com carne de sol e queijo coalho', v: [['1 pessoa', 28], ['2 pessoas', 55]] },
          { n: 'Carcará', d: 'Cará com cupim e queijo coalho assado', v: [['1 pessoa', 28], ['2 pessoas', 55]] },
          { n: 'Genival Lacerda', d: 'Ovo com molho de tomate da casa e parmesão, acompanha torradas', v: [['1 pessoa', 25], ['2 pessoas', 39]] },
          { n: 'Danado de Bom', d: 'Cará cozido com guisado de costela bovina', p: 25 },
          { n: 'Caruaru', d: 'Batata frita coberta com creme de queijo da casa e cupim desfiado', p: 27 },
          { n: 'Tamborete do Forró', d: 'Macaxeira com carne de sol desfiada e fatias de queijo assado', p: 25 },
          { n: 'Maluco Beleza', d: 'Macaxeira com carne de charque e queijo coalho assado', p: 25 },
          { n: 'Chuva de Sombrinha', d: 'Macaxeira cozida com guisado de costela bovina', p: 25 },
          { n: 'Onde Canta o Sabiá', d: 'Banana comprida cozida com carne de sol desfiada e queijo coalho', p: 19 }
        ]
      },
      {
        t: 'Saladas', note: 'Mix de folhas + 5 acompanhamentos + 1 molho.', items: [
          { n: 'Salada com frango grelhado', d: '', p: 30 },
          { n: 'Salada com carne de sol', d: '', p: 35 },
          { n: 'Salada com camarão', d: '', p: 39 }
        ]
      },
      {
        t: 'Omeletes', note: 'Acompanham salada com 1 molho.', items: [
          { n: 'Geraldo Azevedo', d: 'Frango desfiado, tomate-cereja e requeijão', p: 28 },
          { n: 'Dominguinhos', d: 'Carne de sol desfiada com queijo manteiga, tomate-cereja e requeijão', p: 28 },
          { n: 'Luiz Gonzaga', d: 'Charque e queijo coalho ralado', p: 28 },
          { n: 'Reginaldo Rossi', d: 'Camarão ao molho de queijo', p: 35 }
        ]
      }
    ]
  },
  {
    id: 'salgados', label: 'Salgados', img: 'quiche-camarao', cap: 'Quiche de camarão',
    items: [
      { n: 'Quiche de frango e queijo', d: '', p: 17 },
      { n: 'Quiche de camarão', d: 'Massa delicada, recheio caprichado', p: 20, img: 'quiche-camarao' },
      { n: 'Quiche de carne de charque', d: '', p: 17 },
      { n: 'Quiche de queijo do reino', d: '', p: 20 },
      { n: 'Pão de queijo', d: '6 unidades', p: 14 },
      { n: 'Empadão de frango', d: 'Fatia', p: 19 },
      { n: 'Coxinha de frango', d: '4 unidades', p: 19 },
      { n: 'Coxinha de carne seca', d: '4 unidades', p: 29 },
      { n: 'Batata frita', d: 'Porção', p: 15 },
      { n: 'Pastéis', d: '4 unidades: 2 de calabresa e 2 de cupim', p: 29 }
    ]
  },
  {
    id: 'doces', label: 'Doces e sobremesas', img: 'maria-bonita', cap: 'Maria Bonita',
    groups: [
      {
        t: 'Sobremesas', items: [
          { n: 'Maria Bonita', d: 'Torrada de bolo de rolo, sorvete de nata goiaba e creme de queijo do reino', p: 23, b: 'Favorita', img: 'maria-bonita' },
          { n: 'Cocada Ciranda', d: 'Cocada cremosa com sorvete de coco e coco queimado', p: 20 },
          { n: 'Petit gâteau', d: '', p: 25 },
          { n: 'Mini cartola tradicional', d: '', p: 15 },
          { n: 'Mini cartola de chocolate', d: '', p: 18 },
          { n: 'Cartola tradicional', d: '', p: 26 },
          { n: 'Cartola de chocolate', d: '', p: 29 },
          { n: 'Brownie e sorvete de creme', d: '', p: 25 },
          { n: 'Cheesecake', d: 'Fatia, consulte os sabores', p: 25 },
          { n: 'Bolo de rolo com queijo manteiga', d: '', p: 24 }
        ]
      },
      {
        t: 'Doces', items: [
          { n: 'Bolo de rolo', d: 'Tradição pernambucana', p: 15, img: 'bolo-de-rolo' },
          { n: 'Bolo de cenoura com calda de chocolate', d: 'Fatia', p: 15 },
          { n: 'Bolo caseiro do dia', d: 'Fatia', p: 15 },
          { n: 'Fatia torta doce majestade', d: '', p: 22 },
          { n: 'Bolo do dia', d: '', p: 10 },
          { n: 'Super fatia de chocolate', d: '', p: 29 },
          { n: 'Brownie com cobertura e recheio', d: '', p: 18 },
          { n: 'Brownie clássico', d: '', p: 12 },
          { n: 'Bolo de noiva', d: 'Mini', p: 24 }
        ]
      }
    ]
  },
  {
    id: 'cafes', label: 'Cafés e bebidas quentes', img: 'croissant', cap: 'Cappuccino e croissant',
    items: [
      { n: 'Espresso pequeno', d: '40 ml', p: 9 },
      { n: 'Espresso grande', d: '80 ml', p: 14 },
      { n: 'Café filtrado da casa', d: '', p: 9 },
      { n: 'Café filtrado com leite', d: '', p: 10 },
      { n: 'Hario V60 filtrado', d: '', p: 18 },
      { n: 'Cappuccino', d: '', p: 20 },
      { n: 'Cappuccino Garden', d: '', p: 19 },
      { n: 'Cappuccino com Nutella', d: '', p: 19 },
      { n: 'Café machiatto', d: '', p: 16 },
      { n: 'Caramelo machiatto', d: '', p: 22 },
      { n: 'Café mocha', d: '', p: 24 },
      { n: 'Café bombom', d: '', p: 19 },
      { n: 'Café paçoca', d: '', p: 19 },
      { n: 'Café Ovomaltine', d: '', p: 19 },
      { n: 'Chai latte', d: '', p: 15 },
      { n: 'Chocolate quente', d: '', p: 18 },
      { n: 'Chocolate quente com chantilly', d: '', p: 20 },
      { n: 'Xícara de leite', d: '', p: 10 },
      { n: 'Chá quente', d: 'Amora e hibisco, camomila, erva-cidreira, hortelã, maçã com hortelã, preto ou mate', p: 12 }
    ]
  },
  {
    id: 'geladas', label: 'Bebidas geladas', img: 'croissant', cap: 'Para acompanhar',
    groups: [
      {
        t: 'Cafés gelados', items: [
          { n: 'Iced coffee', d: 'Com Nutella', p: 25 },
          { n: 'Afogatto', d: '', p: 29 },
          { n: 'Caipirinha coffee', d: 'Espresso com cachaça, limão e açúcar', p: 26 },
          { n: 'Iced gin coffee', d: '', p: 29 },
          { n: 'Chai latte gelado', d: '', p: 19 }
        ]
      },
      {
        t: 'Shakes', items: [
          { n: 'Coffee shake tradicional', d: '', p: 25 },
          { n: 'Coffee shake Nutella', d: '', p: 28 },
          { n: 'Milk shake com chantilly', d: '', p: 25 },
          { n: 'Milk shake de Nutella', d: '', p: 28 }
        ]
      },
      {
        t: 'Sucos', items: [
          { n: 'Laranja', d: '', v: [['Copo', 13], ['Jarra', 24]] },
          { n: 'Morango', d: '', v: [['Copo', 14], ['Jarra', 25]] },
          { n: 'Morango com laranja ou leite', d: '', v: [['Copo', 16], ['Jarra', 30]] },
          { n: 'Polpa de fruta', d: '', v: [['Copo', 12], ['Jarra', 20]] }
        ]
      },
      {
        t: 'Chás, sodas e refrigerantes', items: [
          { n: 'Chá gelado', d: 'Consulte os sabores', p: 12 },
          { n: 'Chás Monin', d: 'Hibisco, preto com limão, preto com limão e gengibre', p: 18 },
          { n: 'Soda italiana', d: '', p: 15 },
          { n: 'French lemonade', d: '', p: 15 },
          { n: 'Água sem gás', d: '', p: 6 },
          { n: 'Água com gás', d: '', p: 8 },
          { n: 'Refrigerante lata', d: '', p: 10 },
          { n: 'Schweppes citrus', d: '', p: 10 },
          { n: 'H2O', d: '', p: 12 },
          { n: 'Sumo de limão', d: '', p: 4 },
          { n: 'Heineken 0 álcool', d: '', p: 13 }
        ]
      },
      {
        t: 'Alcoólicas', items: [
          { n: 'Budweiser long neck', d: '', p: 10 },
          { n: 'Heineken long neck', d: '', p: 13 },
          { n: 'Whisky J. Walker Red', d: 'Dose', p: 13 },
          { n: 'Licor Amarula', d: 'Dose', p: 12 },
          { n: 'Licor Cointreau', d: 'Dose', p: 14 },
          { n: 'Conhaque Domecq', d: 'Dose', p: 6 },
          { n: 'Campari', d: 'Dose', p: 9 },
          { n: 'Rum Montilla', d: 'Dose', p: 8 }
        ]
      }
    ]
  }
];
