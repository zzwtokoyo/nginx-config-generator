import * as fs from 'fs';
import * as path from 'path';

export enum ProjectType {
    REACT = 'react',
    REACT_TS = 'react-ts',
    VUE = 'vue',
    VUE_TS = 'vue-ts',
    ANGULAR = 'angular',
    NEXT = 'next',
    NUXT = 'nuxt',
    SVELTE = 'svelte',
    GENERIC = 'generic'
}

export interface ProjectInfo {
    type: ProjectType;
    name: string;
    version: string;
    buildDir: string;
    publicPath: string;
    isSPA: boolean;
    port: number;
    framework: string;
}

export class ProjectDetector {
    async detect(projectPath: string): Promise<ProjectInfo> {
        const packageJsonPath = path.join(projectPath, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            return this.getDefaultProjectInfo();
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };

        // 检测项目类型
        let projectType = ProjectType.GENERIC;
        let framework = 'Generic';
        let buildDir = 'dist';
        let publicPath = '/';
        let isSPA = true;
        let port = 3000;

        // Next.js
        if (dependencies['next']) {
            projectType = ProjectType.NEXT;
            framework = 'Next.js';
            buildDir = '.next';
            isSPA = false;
            port = 3000;
        }
        // Nuxt
        else if (dependencies['nuxt'] || dependencies['nuxt3']) {
            projectType = ProjectType.NUXT;
            framework = 'Nuxt';
            buildDir = '.output';
            isSPA = false;
            port = 3000;
        }
        // Angular
        else if (dependencies['@angular/core']) {
            projectType = ProjectType.ANGULAR;
            framework = 'Angular';
            buildDir = 'dist';
            
            // 读取 angular.json 获取输出路径
            const angularJsonPath = path.join(projectPath, 'angular.json');
            if (fs.existsSync(angularJsonPath)) {
                const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
                const projectName = Object.keys(angularJson.projects)[0];
                if (projectName) {
                    buildDir = angularJson.projects[projectName].architect?.build?.options?.outputPath || 'dist';
                }
            }
            isSPA = true;
            port = 4200;
        }
        // Vue
        else if (dependencies['vue']) {
            const hasTypeScript = fs.existsSync(path.join(projectPath, 'tsconfig.json'));
            projectType = hasTypeScript ? ProjectType.VUE_TS : ProjectType.VUE;
            framework = hasTypeScript ? 'Vue + TypeScript' : 'Vue';
            
            // 检测 Vite
            if (dependencies['vite']) {
                buildDir = 'dist';
                const viteConfigPath = path.join(projectPath, 'vite.config.ts');
                const viteConfigJsPath = path.join(projectPath, 'vite.config.js');
                const viteConfig = fs.existsSync(viteConfigPath) ? viteConfigPath : viteConfigJsPath;
                
                if (fs.existsSync(viteConfig)) {
                    // 尝试从 vite 配置中读取 base 路径
                    const configContent = fs.readFileSync(viteConfig, 'utf8');
                    const baseMatch = configContent.match(/base:\s*['"]([^'"]+)['"]/);
                    if (baseMatch) {
                        publicPath = baseMatch[1];
                    }
                }
            } else {
                // Vue CLI
                const vueConfigPath = path.join(projectPath, 'vue.config.js');
                if (fs.existsSync(vueConfigPath)) {
                    const configContent = fs.readFileSync(vueConfigPath, 'utf8');
                    const publicPathMatch = configContent.match(/publicPath:\s*['"]([^'"]+)['"]/);
                    if (publicPathMatch) {
                        publicPath = publicPathMatch[1];
                    }
                }
                buildDir = 'dist';
            }
            isSPA = true;
            port = 5173;
        }
        // React
        else if (dependencies['react']) {
            const hasTypeScript = fs.existsSync(path.join(projectPath, 'tsconfig.json'));
            
            // 检测 Vite
            if (dependencies['vite']) {
                projectType = hasTypeScript ? ProjectType.REACT_TS : ProjectType.REACT;
                framework = hasTypeScript ? 'React + Vite + TS' : 'React + Vite';
                buildDir = 'dist';
                port = 5173;
                
                const viteConfigPath = path.join(projectPath, 'vite.config.ts');
                const viteConfigJsPath = path.join(projectPath, 'vite.config.js');
                const viteConfig = fs.existsSync(viteConfigPath) ? viteConfigPath : viteConfigJsPath;
                
                if (fs.existsSync(viteConfig)) {
                    const configContent = fs.readFileSync(viteConfig, 'utf8');
                    const baseMatch = configContent.match(/base:\s*['"]([^'"]+)['"]/);
                    if (baseMatch) {
                        publicPath = baseMatch[1];
                    }
                }
            }
            // 检测 Create React App
            else if (dependencies['react-scripts']) {
                projectType = hasTypeScript ? ProjectType.REACT_TS : ProjectType.REACT;
                framework = hasTypeScript ? 'Create React App + TS' : 'Create React App';
                buildDir = 'build';
                port = 3000;
                
                // 读取 homepage 字段
                if (packageJson.homepage) {
                    try {
                        const url = new URL(packageJson.homepage);
                        publicPath = url.pathname || '/';
                    } catch {
                        publicPath = packageJson.homepage;
                    }
                }
            }
            // 其他 React 项目
            else {
                projectType = hasTypeScript ? ProjectType.REACT_TS : ProjectType.REACT;
                framework = hasTypeScript ? 'React + TypeScript' : 'React';
                buildDir = 'dist';
                port = 3000;
            }
            isSPA = true;
        }
        // Svelte
        else if (dependencies['svelte']) {
            projectType = ProjectType.SVELTE;
            framework = 'Svelte';
            buildDir = 'dist';
            port = 5173;
            isSPA = true;
        }

        return {
            type: projectType,
            name: packageJson.name || 'my-app',
            version: packageJson.version || '1.0.0',
            buildDir,
            publicPath,
            isSPA,
            port,
            framework
        };
    }

    private getDefaultProjectInfo(): ProjectInfo {
        return {
            type: ProjectType.GENERIC,
            name: 'my-app',
            version: '1.0.0',
            buildDir: 'dist',
            publicPath: '/',
            isSPA: true,
            port: 3000,
            framework: 'Generic'
        };
    }

    getFrameworkDescription(info: ProjectInfo): string {
        const descriptions: Record<string, string> = {
            'Next.js': '服务端渲染框架，需要特殊配置处理 SSR',
            'Nuxt': 'Vue 服务端渲染框架，需要特殊配置',
            'Angular': '企业级前端框架，需要处理路由刷新',
            'Vue + TypeScript': '渐进式框架，TypeScript 支持',
            'Vue': '渐进式 JavaScript 框架',
            'React + Vite + TS': '现代 React 开发，Vite 构建工具',
            'React + Vite': '现代 React 开发，Vite 构建工具',
            'Create React App + TS': '经典 React 项目，TypeScript',
            'Create React App': '经典 React 项目',
            'React + TypeScript': 'React 配合 TypeScript',
            'React': 'React 前端库',
            'Svelte': '编译型前端框架',
            'Generic': '通用静态网站'
        };

        return descriptions[info.framework] || '通用项目';
    }
}
