# Manz Skin — Hero V1

Prévia independente da Hero, sem Shopify CLI, upload ou serviços da loja.

Na raiz do repositório, execute:

```powershell
python local-preview/hero-v1/serve.py
```

Abra **http://localhost:8000/local-preview/hero-v1/**.
Redimensione a janela ou use o modo de dispositivos do navegador para conferir desktop e mobile.
Recarregue para repetir a animação. Com `prefers-reduced-motion: reduce`, a entrada é estática.

## Implementação

- Referência: `Downloads/super ref.jpeg`; composição fotográfica com conteúdo no canto inferior esquerdo.
- Fotografia: `Downloads/DSC01982.JPG`, original 6192 × 4128. As três cópias JPEG em assets preservam a proporção e não alteram o original.
- Hero V2: full bleed sem margem ou cantos; `width: 100%`, `height: 100svh`, `object-fit: cover`.
- Desktop: centro da fotografia. Mobile: corte central autorizado, com rostos laterais parcialmente fora da viewport.
- Título/logo: Bodoni Moda regular, optical size 96. Navegação e textos pequenos: Jost 300. Arquivos WOFF2 locais com suporte aos acentos portugueses.
- A tipografia foi ampliada em V2; gradientes discretos cobrem somente as áreas superior e inferior, preservando a fotografia no centro.
- Animação: GSAP 3.13.0, vendorizado, timeline de 1,9 s. Nenhum plugin ou animação de scroll.
- A Hero usa um custom element para inicializar e limpar a animação durante atualizações do Theme Editor.

## Shopify e limites da prévia

A única section adicionada é `manz-hero-v1`, no começo da homepage; todas as sections anteriores e suas configurações permanecem.
A aparência do header se aplica apenas à homepage com a Hero presente. A barra de anúncios fica visualmente oculta nessa composição, preservando sua configuração.
Busca, conta e carrinho mantêm os componentes, rotas e lógica originais. O perfil continua condicionado à habilitação de contas na loja.
O menu mobile utiliza o drawer existente e seu tratamento de teclado/foco.

No Theme Editor, a Hero permite alterar fotografia, textos, ponto focal e overlay. O header oferece URLs opcionais para Sabonetes, Acessórios e Rastreamento; sem substituições, usa os links reais do menu. Destinos ausentes ficam sem link até configuração; nenhuma URL de rastreamento é inventada.

A prévia local compartilha o CSS, a imagem, as fontes, o JavaScript de entrada e o comportamento nativo do drawer. Usa os valores padrão da Hero e ícones do tema.
Somente INÍCIO e o menu mobile são interativos. Os demais links e ícones são visuais, sem pesquisa, login, carrinho, checkout ou dados da Shopify.
A prévia mostra apenas a Hero, enquanto a homepage Shopify conserva as sections seguintes. Não valida execução de Liquid, links remotos, integrações ou configuração persistida no Theme Editor.

## Verificações desta implementação

Schemas JSON e IDs de settings válidos; delimitação dos blocos Liquid conferida; JavaScript verificado com `node --check`; recursos da prévia servidos com HTTP 200; referências locais de fontes e imagens existentes; `git diff --check` sem erros de whitespace.
As sections e configurações anteriores da homepage foram comparadas com Git e permanecem iguais. O mesmo foi conferido para os settings do header, configuração persistida, JavaScript nativo e busca.
Os breakpoints de desktop, mobile, telas de 320 px e landscape foram revisados estaticamente. A sessão não disponibilizou um navegador para captura e inspeção da renderização: a conferência visual em desktop/mobile e a execução do Liquid na Shopify seguem pendentes.

## Fontes e licença

- [Bodoni Moda / Google Fonts](https://github.com/google/fonts/tree/main/ofl/bodonimoda): SIL Open Font License, cópia em `docs/licenses/bodoni-moda-OFL.txt`.
- [Jost / Google Fonts](https://github.com/google/fonts/tree/main/ofl/jost): SIL Open Font License, cópia em `docs/licenses/jost-OFL.txt`.
- [GSAP 3.13.0](https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js): aviso de licença preservado no arquivo; [licença padrão](https://gsap.com/standard-license/).
- [Timeline](https://gsap.com/docs/v3/GSAP/Timeline/) e [gsap.matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/): documentação utilizada para a sequência e a preferência de movimento reduzido.
