# Alterações no schema.prisma — Renda 2.x

## 1. Model `Candidato` — adicionar relações

Dentro do model `Candidato`, adicionar estas linhas junto às outras relações:

```prisma
  fontesRenda       FonteRenda[]
  rendasMensais     RendaMensal[]
```

## 2. Model `MembroFamilia` — adicionar relação

Dentro do model `MembroFamilia`, adicionar:

```prisma
  fontesRenda     FonteRenda[]
```

(já possui `rendaMensal RendaMensal[]`)

## 3. Model `RendaMensal` — SUBSTITUIR

Substituir o model `RendaMensal` inteiro pelo conteúdo de `RendaMensal-model-SUBSTITUIR.prisma`.

**ATENÇÃO:** A antiga `@@unique([membroId, mes, ano])` foi REMOVIDA (agora um membro pode ter 
várias fontes, cada uma com renda no mesmo mês).

## 4. Model `FonteRenda` — ADICIONAR

Adicionar o model `FonteRenda` de `FonteRenda-model-ADICIONAR.prisma` APÓS o model `RendaMensal`.

## 5. Gerar client

```bash
cd api && npx prisma generate
```

**NÃO rodar `prisma db push`!** O SQL já criou as colunas/tabelas.
