import { MantineThemeOverride } from '@mantine/core';

/**
 * Theme configuration inspired by modern design systems
 * References: GitHub, Vercel, Linear
 */
export const themeConfig: MantineThemeOverride = {
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  
  colors: {
    // Custom color palette for better contrast
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },

  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    ActionIcon: {
      defaultProps: {
        variant: 'subtle',
      },
    },
  },
};

