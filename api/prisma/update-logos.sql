-- =============================================
-- ATUALIZAR logoUrl DOS TENANTS EXISTENTES
-- Rodar uma vez no banco de produção
-- =============================================

UPDATE tenants SET "logoUrl" = '/images/tenants/logo-PUCMinas.png' WHERE slug = 'PUCMinas';
UPDATE tenants SET "logoUrl" = '/images/tenants/logo-Metodista.png' WHERE slug = 'Metodista';

-- Verificar
SELECT slug, nome, "logoUrl" FROM tenants;
