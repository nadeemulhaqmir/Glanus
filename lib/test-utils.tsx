import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Custom render without providers since they're mocked globally in jest.setup.js
function customRender(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return rtlRender(ui, options)
}

export * from '@testing-library/react'
export { customRender as render }
