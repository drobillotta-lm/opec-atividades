-- Os e-mails dos 6 fixos vieram da 004 como `nome@livemode.com`, um palpite. Os reais sao
-- os que eles ja usam para entrar na Escala (escala.pessoas, 28/09/2026). Como
-- private.liga_conta() casa a conta Google pelo e-mail no primeiro login, com o palpite
-- os seis cairiam em "fora do time". Ninguem alem do Daniel tinha logado ate aqui.
update pessoas p
   set email = v.email
  from (values
    ('Bárbara', 'breis@livemode.com'),
    ('Gabriel', 'gduarte@livemode.com'),
    ('Julia',   'jbruno@livemode.com'),
    ('Juliana', 'jbecker@livemode.com'),
    ('Lucas',   'lmatias@livemode.com'),
    ('Pedro',   'plopes@livemode.com')
  ) as v(nome, email)
 where p.nome = v.nome;

-- Nacional nao tinha lider (decisoes.yaml do Yuri deixa NA como dupla fixa Daniel +
-- Juliana, sem lider). Decisao do Daniel em 28/09: Juliana lidera. E a unica frente em
-- que o lider tambem executa -- NA e dupla fixa, nao rotacao, e a regra "lider nao
-- executa a propria frente" nunca valeu para ela.
update frentes
   set lider_id = (select id from pessoas where nome = 'Juliana')
 where sigla = 'NA';
