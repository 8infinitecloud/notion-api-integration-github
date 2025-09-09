# GitHub to Notion Sync

Sincroniza automáticamente tus repositorios de GitHub con una base de datos de Notion, generando insights y métricas útiles.

## 🚀 Características

- Sincronización automática de repositorios públicos y privados
- Extracción de métricas: estrellas, forks, issues, lenguajes
- Análisis de insights: actividad reciente, estadísticas de lenguajes
- Integración completa con Notion para visualización y reportes

## 📋 Requisitos

- Node.js 16+
- Cuenta de GitHub
- Workspace de Notion
- Tokens de acceso para ambas plataformas

## ⚡ Instalación

1. **Clona el repositorio:**
```bash
git clone <tu-repo>
cd github-notion-sync
```

2. **Instala dependencias:**
```bash
npm install
```

3. **Configura variables de entorno:**
```bash
cp .env.example .env
```

## 🔧 Configuración

### 1. Token de GitHub
- Ve a https://github.com/settings/tokens
- Genera un nuevo token (classic)
- Permisos necesarios: `repo`, `user`
- Copia el token a `.env`

### 2. Token de Notion
- Ve a https://www.notion.so/my-integrations
- Crea nueva integración
- Copia el token a `.env`

### 3. Base de datos de Notion
Crea una base de datos con estas propiedades:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| Name | Title | Nombre del repositorio |
| Description | Text | Descripción del repo |
| Language | Select | Lenguaje principal |
| Stars | Number | Número de estrellas |
| Forks | Number | Número de forks |
| Issues | Number | Issues abiertas |
| Size (KB) | Number | Tamaño en KB |
| Created | Date | Fecha de creación |
| Updated | Date | Última actualización |
| URL | URL | Link al repositorio |
| Private | Checkbox | Si es privado |
| Topics | Multi-select | Tags del repo |

### 4. Archivo .env
```env
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🏃‍♂️ Uso

### Sincronización manual
```bash
npm run sync
```

### Sincronización automática con GitHub Actions

El proyecto incluye un GitHub Action que se ejecuta automáticamente:

- **Diariamente a las 9:00 AM UTC**
- **Manualmente** desde la pestaña Actions

#### Configurar secrets en GitHub:
1. Ve a tu repositorio → Settings → Secrets and variables → Actions
2. Agrega estos secrets:
   - `NOTION_TOKEN`: Tu token de Notion
   - `GITHUB_TOKEN`: Tu token de GitHub
   - `NOTION_DATABASE_ID`: ID de tu base de datos

#### Ejecución manual:
- Ve a Actions → "Sync GitHub Repos to Notion" → "Run workflow"

### Programar sincronización local (alternativa)
```bash
0 9 * * * cd /ruta/al/proyecto && npm run sync
```

## 📊 Insights Generados

El script genera automáticamente:

- **Total de repositorios**
- **Estadísticas de lenguajes** (top 5)
- **Total de estrellas** y promedio
- **Repositorio más popular**
- **Actividad reciente** (últimos 30 días)

## 📁 Estructura del Proyecto

```
├── github-notion-sync.js    # Clase principal
├── sync.js                  # Script de ejecución
├── package.json            # Dependencias
├── .env.example           # Template de configuración
└── README.md             # Documentación
```

## 🔄 Casos de Uso en Notion

Una vez sincronizado, puedes:

- **Dashboards:** Crear vistas por lenguaje, popularidad, fecha
- **Reportes:** Generar informes automáticos de actividad
- **Portfolio:** Mostrar proyectos destacados
- **Análisis:** Identificar patrones en tu desarrollo
- **Planificación:** Priorizar mantenimiento de repos

## 🛠️ Personalización

### Agregar nuevas métricas
Modifica el método `getRepositories()` en `github-notion-sync.js`:

```javascript
// Ejemplo: agregar commits recientes
const commits = await this.github.rest.repos.listCommits({
  owner: repo.owner.login,
  repo: repo.name,
  per_page: 1
});
```

### Filtrar repositorios
Agrega filtros en `getRepositories()`:

```javascript
return repos.data
  .filter(repo => !repo.fork) // Excluir forks
  .filter(repo => repo.stargazers_count > 0) // Solo con estrellas
  .map(repo => ({...}));
```

## 🚨 Troubleshooting

### Error de autenticación
- Verifica que los tokens sean válidos
- Asegúrate de que la integración de Notion tenga acceso a la base de datos

### Límites de API
- GitHub: 5000 requests/hora
- Notion: 3 requests/segundo

### Base de datos no encontrada
- Verifica el `NOTION_DATABASE_ID`
- Confirma que la integración tenga permisos

## 📝 Licencia

MIT License - Úsalo libremente para tus proyectos.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Abre un issue o envía un PR.
