#!/usr/bin/env node

import { select, checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ── Paths ────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const STANDALONE_DIR = path.join(REPO_ROOT, 'standalone');
const PLUGINS_DIR = path.join(REPO_ROOT, 'plugins');
const MARKETPLACE_FILE = path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json');

function getClaudeHome() {
  const dir = path.join(os.homedir(), '.claude');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function info(msg) { console.log(chalk.cyan('i'), msg); }
function ok(msg)   { console.log(chalk.green('✓'), msg); }
function warn(msg) { console.log(chalk.yellow('!'), msg); }
function err(msg)  { console.log(chalk.red('✗'), msg); }

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

function rmDirSync(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

// ── 1) CLAUDE.md sync ────────────────────────────────────────────────

async function syncClaudeMd() {
  const src = path.join(STANDALONE_DIR, 'CLAUDE-GLOBAL.md');
  const dest = path.join(getClaudeHome(), 'CLAUDE.md');

  if (!fs.existsSync(src)) {
    err(`Файл не найден: ${src}`);
    return;
  }

  const srcContent = fs.readFileSync(src, 'utf-8');

  console.log();
  info(`Источник:   ${src}`);
  info(`Назначение: ${dest}`);

  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, srcContent, 'utf-8');
    ok('CLAUDE.md создан.');
    return;
  }

  const destContent = fs.readFileSync(dest, 'utf-8');
  if (destContent === srcContent) {
    ok('Файлы идентичны, синхронизация не требуется.');
    return;
  }

  const action = await select({
    message: 'Системный CLAUDE.md уже существует. Что сделать?',
    choices: [
      { name: 'Заменить полностью', value: 'replace' },
      { name: 'Дополнить (добавить в конец)', value: 'append' },
      { name: 'Показать diff', value: 'diff' },
      { name: 'Пропустить', value: 'skip' },
    ],
  });

  if (action === 'replace') {
    fs.writeFileSync(dest, srcContent, 'utf-8');
    ok('CLAUDE.md заменён.');
  } else if (action === 'append') {
    fs.appendFileSync(dest, '\n' + srcContent, 'utf-8');
    ok('Содержимое добавлено в конец CLAUDE.md.');
  } else if (action === 'diff') {
    const destLines = destContent.split('\n');
    const srcLines = srcContent.split('\n');
    console.log(chalk.dim('--- системный CLAUDE.md'));
    console.log(chalk.dim('+++ standalone/CLAUDE-GLOBAL.md'));
    const maxLen = Math.max(destLines.length, srcLines.length);
    for (let i = 0; i < maxLen; i++) {
      const dl = destLines[i], sl = srcLines[i];
      if (dl === sl) continue;
      if (dl !== undefined) console.log(chalk.red(`-${i + 1}: ${dl}`));
      if (sl !== undefined) console.log(chalk.green(`+${i + 1}: ${sl}`));
    }
    if (await confirm({ message: 'Заменить системный файл?' })) {
      fs.writeFileSync(dest, srcContent, 'utf-8');
      ok('CLAUDE.md заменён.');
    }
  } else {
    info('Пропущено.');
  }
}

// ── 2) Standalone skills/commands sync ───────────────────────────────

function collectSkills(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (fs.existsSync(path.join(full, 'SKILL.md'))) result.push(full);
    collectSkills(full, result);
  }
  return result;
}

function collectCommandDirs(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    const hasMd = fs.readdirSync(full).some(f => f.endsWith('.md') && fs.statSync(path.join(full, f)).isFile());
    if (hasMd) result.push(full);
    collectCommandDirs(full, result);
  }
  return result;
}

async function syncStandaloneCategory(kind) {
  const srcRoot = path.join(STANDALONE_DIR, kind);
  const destRoot = path.join(getClaudeHome(), kind);

  if (!fs.existsSync(srcRoot)) {
    warn(`Каталог не найден: ${srcRoot}`);
    return;
  }

  const dirs = kind === 'skills' ? collectSkills(srcRoot) : collectCommandDirs(srcRoot);
  if (dirs.length === 0) {
    info(`Нет ${kind} для синхронизации.`);
    return;
  }

  const mapping = dirs.map(src => {
    const name = path.basename(src);
    return {
      src,
      name,
      dest: path.join(destRoot, name),
      label: `${path.relative(srcRoot, src)} → ${kind}/${name}`,
    };
  });

  const selected = await checkbox({
    message: `Выберите ${kind} для синхронизации:`,
    choices: mapping.map(m => ({ name: m.label, value: m, checked: true })),
    pageSize: 20,
  });

  if (selected.length === 0) {
    info('Ничего не выбрано.');
    return;
  }

  const conflicts = selected.filter(m => fs.existsSync(m.dest));
  let overwriteAll = false, skipExisting = false;

  if (conflicts.length > 0) {
    warn(`${conflicts.length} уже существуют.`);
    const action = await select({
      message: 'Что делать с существующими?',
      choices: [
        { name: 'Перезаписать все', value: 'overwrite' },
        { name: 'Пропустить существующие', value: 'skip' },
        { name: 'Спрашивать по каждому', value: 'ask' },
      ],
    });
    if (action === 'overwrite') overwriteAll = true;
    else if (action === 'skip') skipExisting = true;
  }

  for (const m of selected) {
    const exists = fs.existsSync(m.dest);
    if (exists && skipExisting) {
      info(`Пропущен: ${m.name}`);
      continue;
    }
    if (exists && !overwriteAll) {
      if (!(await confirm({ message: `Перезаписать ${m.name}?` }))) {
        info(`Пропущен: ${m.name}`);
        continue;
      }
    }
    rmDirSync(m.dest);
    copyDirSync(m.src, m.dest);
    ok(m.label);
  }
}

// ── 3) Marketplace install into ~/.claude ────────────────────────────

const MARKETPLACE_NAME = 'push-cat';

function buildMarketplaceManifest() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    err(`Каталог плагинов не найден: ${PLUGINS_DIR}`);
    return null;
  }

  const pluginDirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => path.join(PLUGINS_DIR, e.name));

  const plugins = [];
  for (const dir of pluginDirs) {
    const manifest = path.join(dir, '.claude-plugin', 'plugin.json');
    if (!fs.existsSync(manifest)) {
      warn(`Нет plugin.json: ${path.relative(REPO_ROOT, dir)} — пропуск`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(manifest, 'utf-8'));
    plugins.push({
      name: data.name,
      source: `./plugins/${path.basename(dir)}`,
      description: data.description,
      version: data.version,
    });
  }

  plugins.sort((a, b) => a.name.localeCompare(b.name));

  return {
    name: MARKETPLACE_NAME,
    owner: { name: 'monkey-di' },
    plugins,
  };
}

async function installMarketplace() {
  const marketplace = buildMarketplaceManifest();
  if (!marketplace) return;

  // Записываем marketplace.json в репо (для коммита в git).
  fs.mkdirSync(path.dirname(MARKETPLACE_FILE), { recursive: true });
  fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(marketplace, null, 2) + '\n', 'utf-8');
  ok(`marketplace.json: ${marketplace.plugins.length} плагин(ов) → ${path.relative(REPO_ROOT, MARKETPLACE_FILE)}`);
  for (const p of marketplace.plugins) console.log(chalk.dim(`  · ${p.name} (${p.version})`));

  // Копируем плагины + marketplace.json в ~/.claude/marketplaces/push-cat/
  // — Claude Code будет читать оттуда, репо можно потом удалить/переместить.
  const installRoot = path.join(getClaudeHome(), 'marketplaces', MARKETPLACE_NAME);
  rmDirSync(installRoot);
  fs.mkdirSync(installRoot, { recursive: true });
  copyDirSync(PLUGINS_DIR, path.join(installRoot, 'plugins'));
  fs.mkdirSync(path.join(installRoot, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(
    path.join(installRoot, '.claude-plugin', 'marketplace.json'),
    JSON.stringify(marketplace, null, 2) + '\n',
    'utf-8',
  );
  ok(`Плагины скопированы в ${installRoot}`);

  registerMarketplace(installRoot);
  await enablePlugins(marketplace);
}

function registerMarketplace(installPath) {
  const settingsFile = path.join(getClaudeHome(), 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    } catch (e) {
      warn(`Не удалось распарсить ${settingsFile}: ${e.message}`);
      return;
    }
  }

  const marketplaces = settings.extraKnownMarketplaces || {};
  const desired = { source: { source: 'directory', path: installPath } };

  if (JSON.stringify(marketplaces[MARKETPLACE_NAME]) === JSON.stringify(desired)) {
    info(`Marketplace "${MARKETPLACE_NAME}" уже зарегистрирован на ${installPath}`);
    return;
  }

  marketplaces[MARKETPLACE_NAME] = desired;
  settings.extraKnownMarketplaces = marketplaces;
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  ok(`Marketplace "${MARKETPLACE_NAME}" зарегистрирован в ~/.claude/settings.json (source: ${installPath})`);
}

async function enablePlugins(marketplace) {
  const settingsFile = path.join(getClaudeHome(), 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsFile)) {
    settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  }
  const enabled = settings.enabledPlugins || {};

  const selected = await checkbox({
    message: 'Какие плагины push-cat включить?',
    choices: marketplace.plugins.map(p => {
      const key = `${p.name}@${MARKETPLACE_NAME}`;
      return {
        name: `${p.name} — ${p.description}`,
        value: p.name,
        checked: enabled[key] === true,
      };
    }),
    pageSize: 20,
  });

  const selectedSet = new Set(selected);
  let on = 0, off = 0;
  for (const p of marketplace.plugins) {
    const key = `${p.name}@${MARKETPLACE_NAME}`;
    const want = selectedSet.has(p.name);
    if (want) {
      if (enabled[key] !== true) on++;
      enabled[key] = true;
    } else {
      if (enabled[key] === true) off++;
      delete enabled[key];
    }
  }
  settings.enabledPlugins = enabled;
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  ok(`Включено: ${selected.length}/${marketplace.plugins.length} (+${on}, −${off})`);
  info('Перезапусти Claude Code — изменения подхватятся.');
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log();
  console.log(chalk.bold('=^._.^= push-cat — Push Claude Code Catalog'));
  console.log(chalk.dim('─'.repeat(40)));
  info(`OS: ${os.platform()} (${os.arch()})`);
  info(`Repo: ${REPO_ROOT}`);
  info(`Claude dir: ${getClaudeHome()}`);
  console.log();

  const choices = [
    { name: 'CLAUDE.md (глобальный, standalone/CLAUDE-GLOBAL.md)', value: 'claude-md', checked: true },
  ];
  if (collectSkills(path.join(STANDALONE_DIR, 'skills')).length > 0) {
    choices.push({ name: 'Standalone skills (standalone/skills/* → ~/.claude/skills/)', value: 'skills', checked: true });
  }
  if (collectCommandDirs(path.join(STANDALONE_DIR, 'commands')).length > 0) {
    choices.push({ name: 'Standalone commands (standalone/commands/* → ~/.claude/commands/)', value: 'commands', checked: true });
  }
  choices.push({ name: 'Marketplace: установить плагины в ~/.claude/marketplaces/push-cat/ и зарегистрировать', value: 'marketplace', checked: true });

  const tasks = await checkbox({
    message: 'Что синхронизировать?',
    choices,
  });

  if (tasks.length === 0) {
    info('Ничего не выбрано. Выход.');
    return;
  }

  for (const task of tasks) {
    console.log();
    console.log(chalk.bold.underline(
      task === 'claude-md' ? 'CLAUDE.md' :
      task === 'skills' ? 'Standalone skills' :
      task === 'commands' ? 'Standalone commands' :
      'Marketplace'
    ));
    if (task === 'claude-md')   await syncClaudeMd();
    if (task === 'skills')      await syncStandaloneCategory('skills');
    if (task === 'commands')    await syncStandaloneCategory('commands');
    if (task === 'marketplace') await installMarketplace();
  }

  console.log();
  ok('Готово!');
}

main().catch(e => {
  err(e.message);
  process.exit(1);
});
