-- 023 pediu para criar frente pela tela (Kings League, por exemplo) -- mas o
-- constraint da sigla era uma lista fechada (FI, OL, PR, CP, NA, KG), sobrando so
-- pras 6 que ja existiam. Vira formato (2 a 6 letras maiusculas), nao lista.
alter table frentes drop constraint frentes_sigla_check;
alter table frentes add constraint frentes_sigla_check check (sigla ~ '^[A-Z]{2,6}$');
