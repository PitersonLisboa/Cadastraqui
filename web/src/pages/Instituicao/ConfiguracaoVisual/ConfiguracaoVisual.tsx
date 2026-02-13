import { useState, useRef, useEffect } from 'react'
import { toast } from 'react-toastify'
import { FiUpload, FiTrash2, FiSave, FiImage } from 'react-icons/fi'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { Card } from '@/components/common/Card/Card'
import styles from './ConfiguracaoVisual.module.scss'

export function ConfiguracaoVisual() {
  const { tenant, slug } = useTenant()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [corPrimaria, setCorPrimaria] = useState('#1F4B73')
  const [corSecundaria, setCorSecundaria] = useState('#3b82f6')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tenant) {
      setLogoPreview(tenant.logoUrl)
      setCorPrimaria(tenant.corPrimaria || '#1F4B73')
      setCorSecundaria(tenant.corSecundaria || '#3b82f6')
    }
  }, [tenant])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validação local
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      toast.error('Tipo não permitido. Use JPG, PNG, WebP ou SVG.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.')
      return
    }

    // Upload
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.patch(`/tenant/${slug}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setLogoPreview(response.data.logoUrl)
      toast.success('Logo atualizado!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar logo')
    } finally {
      setUploading(false)
      // Limpar input para permitir reenvio do mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Remover o logo da instituição?')) return

    try {
      await api.delete(`/tenant/${slug}/logo`)
      setLogoPreview(null)
      toast.success('Logo removido')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao remover logo')
    }
  }

  const handleSaveColors = async () => {
    setSaving(true)
    try {
      await api.put(`/tenant/${slug}`, {
        corPrimaria,
        corSecundaria,
      })
      toast.success('Cores atualizadas! Recarregue a página para ver o efeito.')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar cores')
    } finally {
      setSaving(false)
    }
  }

  const apiBaseUrl = api.defaults.baseURL || ''

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Configuração Visual</h1>
      <p className={styles.pageDescription}>
        Personalize a aparência da tela de login e do sistema para sua instituição.
      </p>

      <div className={styles.grid}>
        {/* ===== LOGO ===== */}
        <Card className={styles.card}>
          <h2 className={styles.cardTitle}>
            <FiImage size={20} />
            Logo da Instituição
          </h2>
          <p className={styles.cardDescription}>
            Este logo aparece no cabeçalho da tela de login, entre o logo do Cadastraqui e o botão "Acesso Restrito".
          </p>

          <div className={styles.logoArea}>
            {logoPreview ? (
              <div className={styles.logoPreviewWrapper}>
                <img
                  src={logoPreview.startsWith('http') ? logoPreview : `${apiBaseUrl}${logoPreview}`}
                  alt="Logo da instituição"
                  className={styles.logoPreview}
                />
                <button
                  className={styles.removeBtn}
                  onClick={handleRemoveLogo}
                  title="Remover logo"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ) : (
              <div className={styles.logoPlaceholder}>
                <FiImage size={48} />
                <span>Nenhum logo cadastrado</span>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFileSelect}
            className={styles.hiddenInput}
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
            fullWidth
          >
            <FiUpload size={16} />
            {logoPreview ? 'Trocar Logo' : 'Enviar Logo'}
          </Button>

          <p className={styles.hint}>
            Formatos: JPG, PNG, WebP ou SVG. Máximo 5MB.
            Recomendado: fundo transparente, proporção horizontal.
          </p>
        </Card>

        {/* ===== CORES ===== */}
        <Card className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span style={{ color: corPrimaria }}>●</span>
            Cores do Tema
          </h2>
          <p className={styles.cardDescription}>
            As cores são aplicadas nos botões, links e elementos de destaque da tela de login.
          </p>

          <div className={styles.colorField}>
            <label className={styles.colorLabel}>Cor Primária</label>
            <div className={styles.colorInputRow}>
              <input
                type="color"
                value={corPrimaria}
                onChange={(e) => setCorPrimaria(e.target.value)}
                className={styles.colorPicker}
              />
              <Input
                value={corPrimaria}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCorPrimaria(e.target.value)}
                placeholder="#1F4B73"
              />
            </div>
          </div>

          <div className={styles.colorField}>
            <label className={styles.colorLabel}>Cor Secundária</label>
            <div className={styles.colorInputRow}>
              <input
                type="color"
                value={corSecundaria}
                onChange={(e) => setCorSecundaria(e.target.value)}
                className={styles.colorPicker}
              />
              <Input
                value={corSecundaria}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCorSecundaria(e.target.value)}
                placeholder="#3b82f6"
              />
            </div>
          </div>

          {/* Preview */}
          <div className={styles.previewSection}>
            <span className={styles.previewLabel}>Preview do botão:</span>
            <button
              className={styles.previewButton}
              style={{ backgroundColor: corPrimaria }}
            >
              Acesso Restrito ▾
            </button>
          </div>

          <Button onClick={handleSaveColors} loading={saving} fullWidth>
            <FiSave size={16} />
            Salvar Cores
          </Button>
        </Card>
      </div>
    </div>
  )
}
