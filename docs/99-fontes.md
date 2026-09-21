# Fontes

## Repositórios

| O quê | Onde |
|---|---|
| Modelo de dimensionamento | `github.com/ymuanes/opec-dimensionamento` (privado, Python, branch `master`) |
| Este app | `github.com/drobillotta-lm/opec-atividades` (privado) |

### O que cada arquivo do dimensionamento nos dá

| Arquivo | Usado para |
|---|---|
| `config/pessoas.csv` | tabela `pessoas`: nível, jornada, entrada, saída |
| `config/decisoes.yaml` | frentes, líderes, regimes, restrições, regras de plantão |
| `config/mapa_aprovado.csv` | tabela `mapa`: quem faz o quê em cada mês |
| `config/taxas.yaml` | `estimativa_min` de cada tarefa |
| `dados/matriz_eventos.csv` | tabela `eventos` |
| `acompanhamento/registro/*.csv` | o formato que o app substitui, e o CSV que ele exporta |
| `acompanhamento/fechar_semana.py` | os números que `v_semana_frente` precisa reproduzir |

### Taxas vigentes, medidas em julho de 2026

| Tarefa | Horas |
|---|---|
| materiais | 1,5 |
| sincronização | 1,5 |
| roteiro | 1,0 |
| auditoria | 2,0 |
| Nacional: materiais + sincronização | 3,0 |
| Nacional: roteiro + auditoria | 3,0 |
| plantão em dia útil | 4,5 |
| plantão em fim de semana | jornada da pessoa (8h ou 6h) |

Teto de ocupação 85%. Entrega em até 48h depois do evento.

## Material de origem

`fontes/pesquisa-original.md` — o documento que deu origem ao projeto, preservado como veio.
São quatro textos costurados: a proposta do Daniel e três rodadas de IA. As contradições
entre eles estão resolvidas em `../01-decisoes.md`. O documento cita dois mockups que não
acompanham o arquivo.

## Serviços

| Serviço | Estado |
|---|---|
| Supabase | projeto `opec-atividades`, ref `igzrrsqmweuritiqrmrh`, região sa-east-1 |
| Vercel | projeto `opec-atividades`, no ar em https://opec-atividades.vercel.app |
| Google OAuth | a criar. Callback: `https://igzrrsqmweuritiqrmrh.supabase.co/auth/v1/callback` |

Segredos ficam em `.env.local`, fora do versionamento, e nas variáveis de ambiente da Vercel.
Este arquivo registra onde as coisas estão, nunca o valor delas.
