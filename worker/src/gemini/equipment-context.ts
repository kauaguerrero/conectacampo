// Contexto genérico de equipamentos/agro repassado ao Gemini para orientar a
// geração de conteúdo. Não inclui nenhum dado interno/sensível da empresa —
// apenas modelos de máquina, o que é informação pública de fabricante.
export const EQUIPMENT_CONTEXT = `
A operação trabalha com os seguintes equipamentos:
- Colhedora de cana: John Deere CH570
- Trator: John Deere 6190J, 7230J, 7M230
- Transbordo: Teston, TMA, Megatec
- Aplicador de vinhaça e água: Nonino, TMA
- Plantadora de cana: TT, DMB
- Preparo de solo: grade aradora, niveladora, terraciador, eliminador de soqueira, canterizador
- Linha amarela: pá carregadeira, trator de esteira, motoniveladora, retroescavadeira, escavadeira
`.trim();
