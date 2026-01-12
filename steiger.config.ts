import { defineConfig } from 'steiger'
import fsd from '@feature-sliced/steiger-plugin'

export default defineConfig([
    ...fsd.configs.recommended,
    {
        rules: {
            // Allow slices with few references (project is growing)
            'fsd/insignificant-slice': 'off',
        },
    },
])
