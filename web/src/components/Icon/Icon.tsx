// ===========================================
// CADASTRAQUI - Componente Icon
// ===========================================
// Uso: <Icon name="student" size={24} className="meu-estilo" />
// Os SVGs ficam em /public/icons/ e são carregados via <img>
// Para ícones inline (coloríveis via CSS), usar react-icons/fi

import React from 'react';
import styles from './Icon.module.scss';

// Mapeamento de nomes amigáveis → arquivo SVG
const ICON_MAP: Record<string, string> = {
  'add-document': 'add-document',
  'add-user': 'add-user',
  'arrow': 'arrow',
  'book': 'book',
  'calendar': 'calendar',
  'car': 'car',
  'check': 'check',
  'chevron': 'chevron',
  'clock': 'clock',
  'close': 'close',
  'currency': 'currency',
  'doctor': 'doctor',
  'document': 'document',
  'edit': 'edit',
  'error': 'error',
  'excel': 'excel',
  'exit': 'exit',
  'eye-close': 'eye-close',
  'eye-open': 'eye-open',
  'family': 'family',
  'file-circle-plus': 'fileCirclePlus',
  'filter': 'filter',
  'folder': 'folder',
  'gear': 'gear',
  'hamburger': 'hamburger',
  'home': 'home',
  'house': 'house',
  'institution': 'institution',
  'lab': 'lab',
  'legal': 'legal',
  'lightbulb': 'lightbulb',
  'list': 'list',
  'loading': 'loading',
  'logo': 'logo',
  'magnifier': 'magnifier',
  'money': 'money',
  'one-round': 'one-round',
  'pdf': 'PDF',
  'pencil': 'pencil',
  'people': 'people',
  'player-play': 'player-play',
  'profile': 'profile',
  'question-mark': 'question-mark',
  'save': 'save',
  'siren': 'siren',
  'student': 'student',
  'student-list': 'student-list',
  'student-register': 'student-register',
  'students-manager': 'students-manager',
  'students-renew': 'students-renew',
  'two-round': 'two-round',
  'upload': 'upload',
  'user': 'user',
  'user-request': 'user_request',
  'users': 'users',
};

export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  className = '',
  alt,
  onClick,
}) => {
  const fileName = ICON_MAP[name];

  if (!fileName) {
    console.warn(`[Icon] Nome desconhecido: "${name}"`);
    return null;
  }

  return (
    <img
      src={`/icons/${fileName}.svg`}
      alt={alt || name}
      width={size}
      height={size}
      className={`${styles.icon} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
      loading="lazy"
    />
  );
};

// Lista de todos os nomes disponíveis (útil para documentação/storybook)
export const AVAILABLE_ICONS = Object.keys(ICON_MAP) as IconName[];

export default Icon;
