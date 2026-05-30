# La Ruleta de la Fortuna

Juego interactivo basado en el concurso de televisión, implementado con React + TypeScript.

## Características Implementadas

### Panel de Letras
- Revelado secuencial de letras (250ms entre cada una)
- Estados visuales: oculta, revelándose, visible, resaltada
- Animaciones de brillo y escala durante el revelado
- Efectos sonoros con Web Audio API (ding, error, éxito, transición)

### Mecánicas del Juego
- Sistema de turnos para múltiples jugadores
- Prueba de consonantes con cálculo de premios
- Compra de vocales (50€ cada una)
- Resolución completa del panel
- Sistema de comodines con diálogo de confirmación
- Bloqueo temporal durante animaciones

### Gestión de Frases
- Añadir nuevas frases con categoría y pista
- Lista de frases disponibles
- Selección manual o aleatoria de frases
- Eliminar frases de la lista
- 5 frases de ejemplo incluidas
- Sistema de 3 rondas por juego

### Ruleta
- Ruleta visual con 13 segmentos que muestran los valores
- Valores visibles: 25€, 50€, 75€, 100€, 200€ (cada uno aparece dos veces)
- Casillas especiales visibles:
  - **QUIEBRA** (rojo oscuro): Pierdes todo tu dinero
  - **PIERDE TURNO** (gris oscuro): Pierdes el turno automáticamente
  - **COMODÍN** (dorado con estrella ★): Ganas un comodín si aciertas la consonante
- Todos los segmentos giran juntos al lanzar la ruleta
- Animación de giro realista con desaceleración
- El puntero dorado indica el resultado
- Las casillas QUIEBRA y PIERDE TURNO permiten usar comodín para evitar el efecto negativo
- Se reinicia al cambiar de turno

### Interfaz
- Panel de letras con pista y categoría
- Información de jugadores con puntuaciones
- Ruleta visual decorativa con resultados
- Controles para girar, probar letras y resolver
- Diálogos modales para comodines
- Gestor de frases integrado
- Indicador de ronda actual

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:5173 en tu navegador.

## Build

```bash
npm run build
```

## Cómo Jugar

1. **Girar la ruleta**: Haz clic en "Girar Ruleta" para obtener el valor por consonante acertada
2. **Decir consonante**: Escribe una letra consonante y haz clic en "Probar Consonante"
   - Si acierta: Se revelan todas las apariciones secuencialmente con sonido
   - Después de acertar: pasas a la fase de compra de vocales
   - Si falla: Sonido de error y opción de usar comodín
3. **Comprar vocales**: Cuestan 50€ cada una
   - Solo disponibles después de acertar una consonante
   - Puedes comprar tantas vocales como dinero tengas
   - Haz clic en "Terminar compra de vocales" cuando termines
4. **Siguiente acción**: Después de la fase de vocales puedes:
   - Girar la ruleta de nuevo (si quedan consonantes)
   - Resolver el panel
5. **Resolver el panel**: Escribe la frase completa y haz clic en "Resolver"
6. **Pasar turno**: Cambia al siguiente jugador (la ruleta se reinicia)

### Flujo del Turno (Estricto)

El turno sigue un flujo estricto de 4 fases:

1. **Fase 1: Girar Ruleta** (obligatorio)
   - Debes girar la ruleta para obtener el valor por consonante
   - No puedes hacer nada más hasta girar

2. **Fase 2: Decir Consonante** (obligatorio)
   - Después de girar, debes decir UNA consonante
   - Si aciertas: pasas a la fase de vocales
   - Si fallas: pierdes el turno (o usas comodín)

3. **Fase 3: Comprar Vocales** (opcional)
   - Solo disponible después de acertar una consonante
   - Puedes comprar tantas vocales como quieras (50€ cada una)
   - Puedes terminar esta fase en cualquier momento

4. **Fase 4: Siguiente Acción**
   - Girar la ruleta de nuevo (si quedan consonantes)
   - Resolver el panel
   - No puedes comprar más vocales en esta fase

**Indicador Visual:**
- Un banner en la parte superior muestra la fase actual
- Los controles se habilitan/deshabilitan según la fase

### Comodines
- Los jugadores NO comienzan con comodines
- Hay UN SOLO comodín en la ruleta (segmento dorado con estrella ★)
- Para ganar el comodín:
  1. Debes caer en el segmento COMODÍN al girar la ruleta
  2. Debes acertar la consonante que digas
  3. Si aciertas: ganas el comodín y el segmento se convierte en 100€
  4. Si fallas: el comodín sigue en la ruleta para el siguiente intento
- Al fallar una letra, puedes usar el comodín para mantener el turno
- Si no usas el comodín, pierdes el turno
- El comodín se reinicia al inicio de cada ronda

### Mecánicas Importantes

**Vocales:**
- Cuestan 50€ cada una
- Solo se pueden comprar DESPUÉS de acertar una consonante
- Se pueden comprar tantas como dinero tengas
- Debes terminar la fase de vocales antes de girar de nuevo o resolver
- Si la vocal no está en la frase: pierdes el turno (o usas comodín)

**Consonantes:**
- Solo se pueden probar DESPUÉS de girar la ruleta
- Debes decir UNA consonante por cada giro de ruleta
- Premio: valor de ruleta × apariciones
- Después de acertar: pasas a la fase de compra de vocales
- Si no quedan consonantes ocultas, debes resolver

**Ruleta:**
- Se puede girar múltiples veces por turno
- Valores: 25€, 50€, 75€, 100€, 200€
- Casillas especiales:
  - **QUIEBRA**: Pierdes todo tu dinero (puedes usar comodín para evitarlo)
  - **PIERDE TURNO**: Pierdes el turno automáticamente (puedes usar comodín para mantenerlo)
  - **COMODÍN**: Si aciertas la consonante, ganas el comodín. El segmento se convierte en 100€
- Se reinicia al cambiar de turno

## Sistema de Rondas

El juego consiste en 3 rondas:
- Cada ronda tiene una frase diferente seleccionada aleatoriamente
- Las frases no se repiten dentro del mismo juego
- Al completar una ronda, automáticamente se pasa a la siguiente
- Después de 3 rondas, el juego termina y se muestran las puntuaciones finales
- Puedes iniciar un nuevo juego en cualquier momento desde el gestor de frases

## Sistema de Puntuación y Cartera

**Durante la ronda:**
- Los jugadores acumulan dinero en su **marcador** (score) al acertar consonantes
- El marcador muestra el dinero ganado en la ronda actual

**Al resolver el panel:**
- El jugador que resuelve correctamente **acumula su marcador en su cartera** (wallet)
- Los demás jugadores **pierden su marcador** (se pone a 0)
- Solo el ganador de la ronda conserva el dinero ganado

**Al inicio de nueva ronda:**
- Todos los marcadores se reinician a 0
- Las carteras mantienen el dinero acumulado de rondas anteriores
- El comodín vuelve a estar disponible en la ruleta

**Ejemplo:**
```
Ronda 1:
- Jugador 1: marcador 500€ (resuelve) → cartera: 500€
- Jugador 2: marcador 300€ → marcador: 0€
- Jugador 3: marcador 200€ → marcador: 0€

Ronda 2:
- Jugador 2: marcador 400€ (resuelve) → cartera: 400€
- Jugador 1: marcador 600€ → marcador: 0€ (cartera sigue: 500€)
- Jugador 3: marcador 100€ → marcador: 0€

Final del juego:
- Jugador 1: 500€ total
- Jugador 2: 400€ total
- Jugador 3: 0€ total
```

## Gestión de Frases

El juego incluye un sistema completo para gestionar las frases:

### Añadir Nuevas Frases
1. Desplázate hasta la sección "Gestionar Frases"
2. Rellena los tres campos:
   - **Frase**: El texto a adivinar (se convierte automáticamente a mayúsculas)
   - **Categoría**: La categoría de la frase (ej: PELÍCULAS, TELEVISIÓN)
   - **Pista**: Una pista para ayudar a los jugadores
3. Haz clic en "Añadir Frase"

### Usar una Frase
- **Selección manual**: Haz clic en "Usar" junto a la frase deseada
- **Selección aleatoria**: Haz clic en "Seleccionar Aleatoria" para elegir una frase al azar

### Eliminar Frases
- Haz clic en "Eliminar" junto a la frase que quieras borrar

### Frases de Ejemplo
El juego incluye 5 frases precargadas:
1. "LA RULETA DE LA FORTUNA" (TELEVISIÓN)
2. "EL SEÑOR DE LOS ANILLOS" (PELÍCULAS)
3. "HAKUNA MATATA" (PELÍCULAS)
4. "EN UN LUGAR DE LA MANCHA" (LITERATURA)
5. "QUE LA FUERZA TE ACOMPAÑE" (PELÍCULAS)

**Nota**: Al iniciar un nuevo juego, se seleccionan 3 frases aleatorias sin repetición.

## Estructura del Proyecto

```
src/
├── components/
│   ├── LetterPanel/      # Panel de letras con animaciones
│   ├── PlayerInfo/       # Información de jugadores
│   ├── GameControls/     # Controles del juego
│   ├── Wheel/            # Ruleta visual
│   ├── Dialog/           # Diálogos modales
│   └── PhraseManager/    # Gestor de frases
├── hooks/
│   └── useLetterReveal/  # Lógica de revelado secuencial
├── types/
│   └── game.ts           # Tipos TypeScript
├── utils/
│   └── audio.ts          # Sistema de audio Web Audio API
└── context/
    ├── GameContext.ts    # Contexto del juego
    └── GameProvider.tsx  # Proveedor de estado global
```

## Configuración

Los tiempos de animación son configurables en `GameProvider.tsx`:

```typescript
config: {
  letterRevealDelay: 250,    // ms entre letras
  turnChangeDelay: 1000,     // ms cambio de turno
  victoryRevealDelay: 250,   // ms revelado final
}
```

## Tecnologías

- React 18
- TypeScript
- Vite
- CSS Modules
- Web Audio API
