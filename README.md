# Oportunidades 2026 — Dental Medrano

Landing pública de productos con precio outlet + panel admin protegido.

---

## Stack
- Next.js 14 (App Router)
- Supabase (base de datos)
- Vercel (deploy)

---

## Setup paso a paso

### 1. Supabase

1. Entrá a https://supabase.com y creá un proyecto nuevo (ej: `oportunidades2026`)
2. Andá a **SQL Editor** y pegá el contenido de `migration.sql`
3. Ejecutá. Eso crea la tabla y carga los 85 productos.
4. En **Settings → API** copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. Variables de entorno locales

Creá un archivo `.env.local` en la raíz con:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_ADMIN_PASSWORD=dm2026admin
```

Podés cambiar la contraseña del admin por lo que quieras.

---

### 3. GitHub

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/SantiagoFamaBJ/oportunidades-2026.git
git push -u origin main
```

---

### 4. Vercel

1. Entrá a https://vercel.com → **Add New Project** → importá el repo
2. En **Environment Variables** agregá las 4 variables del paso 2
3. Deploy → te da la URL pública

---

## URLs

| URL | Descripción |
|-----|-------------|
| `https://tu-url.vercel.app/` | Landing pública |
| `https://tu-url.vercel.app/admin-dm2026` | Panel admin (solo vos) |

El admin **no aparece en ningún link** de la landing. Solo accediendo directo a esa URL.

---

## Admin — qué podés hacer

- **Editar stock** de cualquier producto
- **Pegar URL de imagen** manualmente para los que no cargaron automáticamente
- **Ocultar productos** (sin borrarlos) — dejan de aparecer en la landing
- **Cambiar precio outlet**

---

## Imágenes automáticas

La app intenta cargar cada imagen desde `dentalmedrano.com/wp-content/uploads/` usando el código del producto. Si no encuentra la imagen, muestra un placeholder gris. Desde el admin podés pegar la URL correcta.

Para encontrar la URL de una imagen:
1. Buscá el producto en `dentalmedrano.com`
2. Click derecho en la imagen → "Copiar dirección de imagen"
3. Pegala en el admin → Editar → URL de imagen

---

## Cambiar contraseña admin

En Vercel → Settings → Environment Variables → cambiá `NEXT_PUBLIC_ADMIN_PASSWORD` y hacé redeploy.
