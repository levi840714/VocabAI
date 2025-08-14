import { createTheme } from '@mui/material/styles';

/**
 * Material-UI 主題配置
 * 整合 MemWhiz 的深色主題系統
 */

// 從 CSS 變量獲取顏色值的輔助函數
const getCSSVariable = (variable: string) => {
  if (typeof window === 'undefined') return '#000000';
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
};

// 創建動態主題
export const createMemWhizMuiTheme = (isDark: boolean) => {
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      ...(isDark
        ? {
            // 深色主題配置
            primary: {
              main: 'hsl(217, 91%, 60%)', // 藍色主色調
              dark: 'hsl(217, 91%, 50%)',
              light: 'hsl(217, 91%, 70%)',
            },
            secondary: {
              main: 'hsl(280, 65%, 60%)', // 紫色副色調
              dark: 'hsl(280, 65%, 50%)',
              light: 'hsl(280, 65%, 70%)',
            },
            background: {
              default: 'hsl(222, 84%, 4.9%)', // 主背景
              paper: 'hsl(222, 84%, 8%)', // 卡片/對話框背景
            },
            text: {
              primary: 'hsl(210, 40%, 95%)', // 主文字
              secondary: 'hsl(215, 20%, 65%)', // 次要文字
            },
            divider: 'hsl(217, 32%, 17%)', // 分隔線
            action: {
              active: 'hsl(210, 40%, 95%)',
              hover: 'hsl(217, 32%, 17%)',
              selected: 'hsl(217, 32%, 20%)',
              disabled: 'hsl(215, 20%, 45%)',
              disabledBackground: 'hsl(217, 32%, 12%)',
            },
          }
        : {
            // 淺色主題配置
            primary: {
              main: 'hsl(217, 91%, 60%)',
              dark: 'hsl(217, 91%, 50%)',
              light: 'hsl(217, 91%, 70%)',
            },
            secondary: {
              main: 'hsl(280, 65%, 60%)',
              dark: 'hsl(280, 65%, 50%)',
              light: 'hsl(280, 65%, 70%)',
            },
            background: {
              default: 'hsl(0, 0%, 100%)',
              paper: 'hsl(0, 0%, 100%)',
            },
            text: {
              primary: 'hsl(240, 10%, 3.9%)',
              secondary: 'hsl(240, 5%, 64.9%)',
            },
          }),
    },
    typography: {
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 500,
      },
      h6: {
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      // Dialog 組件樣式覆蓋
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            boxShadow: isDark 
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        },
      },
      // DialogTitle 組件樣式
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: '24px 24px 16px 24px',
            fontSize: '1.5rem',
            fontWeight: 700,
            textAlign: 'center',
          },
        },
      },
      // DialogContent 組件樣式
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '16px 24px',
            '&:first-of-type': {
              paddingTop: 16,
            },
          },
        },
      },
      // Button 組件樣式
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
          },
          outlined: {
            borderColor: isDark ? 'hsl(217, 32%, 17%)' : 'hsl(240, 5.9%, 90%)',
            color: isDark ? 'hsl(210, 40%, 95%)' : 'hsl(240, 10%, 3.9%)',
            '&:hover': {
              backgroundColor: isDark ? 'hsl(217, 32%, 17%)' : 'hsl(240, 4.8%, 95.9%)',
              borderColor: isDark ? 'hsl(217, 32%, 20%)' : 'hsl(240, 5.9%, 80%)',
            },
          },
        },
      },
      // TextField 組件樣式
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: isDark ? 'hsl(217, 32%, 17%)' : 'hsl(0, 0%, 100%)',
              '& fieldset': {
                borderColor: isDark ? 'hsl(217, 32%, 17%)' : 'hsl(240, 5.9%, 90%)',
              },
              '&:hover fieldset': {
                borderColor: isDark ? 'hsl(217, 32%, 25%)' : 'hsl(240, 5.9%, 80%)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'hsl(217, 91%, 60%)',
              },
            },
          },
        },
      },
      // Typography 組件樣式
      MuiTypography: {
        styleOverrides: {
          root: {
            color: 'inherit',
          },
        },
      },
    },
  });
};

// 預設淺色主題
export const lightTheme = createMemWhizMuiTheme(false);

// 預設深色主題
export const darkTheme = createMemWhizMuiTheme(true);