#!/usr/bin/env node

import { select, checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ── Helpers ──────────────────────────────────────────────────────────

const CONFIG_DIR = path.resolve('config');

function getClaudeHome() {
  const home = os.homedir();
  const dir = path.join(home, '.claude');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function info(msg) { console.log(chalk.cyan('i'), msg); }
function ok(msg)   { console.log(chalk.green('✓'), msg); }
function warn(msg) { console.log(chalk.yellow('!'), msg); }
function err(msg)  { console.log(chalk.red('✗'), msg); }

/** Recursively collect all skill folders (folders containing SKILL.md) */
function collectSkills(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const skillFile = path.join(full, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        result.push(full);
      }
      collectSkills(full, result);
    }
  }
  return result;
}

/** Recursively collect all command folders (folders containing .md files directly) */
function collectCommands(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hasMd = fs.readdirSync(full).some(f => f.endsWith('.md'));
      if (hasMd) {
        result.push(full);
      }
      collectCommands(full, result);
    }
  }
  return result;
}

/** Copy entire directory contents (shallow — files only + subdirs recursively) */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── CLAUDE.md sync ───────────────────────────────────────────────────

async function syncClaudeMd() {
  const src = path.join(CONFIG_DIR, 'CLAUDE-GLOBAL.md');
  const dest = path.join(getClaudeHome(), 'CLAUDE.md');

  if (!fs.existsSync(src)) {
    err(`Файл не найден: ${src}`);
    return;
  }

  const srcContent = fs.readFileSync(src, 'utf-8');
  const destExists = fs.existsSync(dest);

  console.log();
  info(`Источник:  ${src}`);
  info(`Назначение: ${dest}`);

  if (destExists) {
    const destContent = fs.readFileSync(dest, 'utf-8');

    // Check if content already matches
    if (destContent === srcContent) {
      ok('Файлы идентичны, синхронизация не требуется.');
      return;
    }

    const action = await select({
      message: 'Системный CLAUDE.md уже существует. Что сделать?',
      choices: [
        { name: 'Заменить полностью', value: 'replace' },
        { name: 'Дополнить (добавить в конец)', value: 'append' },
        { name: 'Найти вхождения (проверить, есть ли наш текст)', value: 'check' },
        { name: 'Показать diff', value: 'diff' },
        { name: 'Пропустить', value: 'skip' },
      ],
    });

    switch (action) {
      case 'replace':
        fs.writeFileSync(dest, srcContent, 'utf-8');
        ok('CLAUDE.md заменён.');
        break;

      case 'append':
        fs.appendFileSync(dest, '\n' + srcContent, 'utf-8');
        ok('Содержимое добавлено в конец CLAUDE.md.');
        break;

      case 'check': {
        const srcLines = srcContent.split('\n').filter(l => l.trim());
        let found = 0;
        let missing = 0;
        for (const line of srcLines) {
          if (destContent.includes(line.trim())) {
            found++;
          } else {
            missing++;
            console.log(chalk.red('  -'), chalk.dim(line.trim().slice(0, 80)));
          }
        }
        console.log();
        info(`Найдено: ${found}/${srcLines.length} строк`);
        if (missing > 0) {
          warn(`Отсутствует: ${missing} строк (показаны выше)`);
          const doAppend = await confirm({ message: 'Дополнить недостающим содержимым?' });
          if (doAppend) {
            const missingLines = srcLines.filter(l => !destContent.includes(l.trim()));
            fs.appendFileSync(dest, '\n' + missingLines.join('\n') + '\n', 'utf-8');
            ok('Недостающие строки добавлены.');
          }
        } else {
          ok('Весь текст уже присутствует в системном файле.');
        }
        break;
      }

      case 'diff': {
        const destLines = destContent.split('\n');
        const srcLines = srcContent.split('\n');
        console.log(chalk.dim('--- системный CLAUDE.md'));
        console.log(chalk.dim('+++ локальный CLAUDE-GLOBAL.md'));
        const maxLen = Math.max(destLines.length, srcLines.length);
        for (let i = 0; i < maxLen; i++) {
          const dl = destLines[i];
          const sl = srcLines[i];
          if (dl === sl) continue;
          if (dl !== undefined && sl === undefined) {
            console.log(chalk.red(`-${i + 1}: ${dl}`));
          } else if (dl === undefined && sl !== undefined) {
            console.log(chalk.green(`+${i + 1}: ${sl}`));
          } else if (dl !== sl) {
            console.log(chalk.red(`-${i + 1}: ${dl}`));
            console.log(chalk.green(`+${i + 1}: ${sl}`));
          }
        }
        // After showing diff, offer to replace
        const doReplace = await confirm({ message: 'Заменить системный файл?' });
        if (doReplace) {
          fs.writeFileSync(dest, srcContent, 'utf-8');
          ok('CLAUDE.md заменён.');
        }
        break;
      }

      case 'skip':
        info('Пропущено.');
        break;
    }
  } else {
    fs.writeFileSync(dest, srcContent, 'utf-8');
    ok('CLAUDE.md создан.');
  }
}

// ── Skills sync ──────────────────────────────────────────────────────

async function syncSkills() {
  const skillsSource = path.join(CONFIG_DIR, 'skills');
  const skillsDest = path.join(getClaudeHome(), 'skills');

  if (!fs.existsSync(skillsSource)) {
    err(`Каталог skills не найден: ${skillsSource}`);
    return;
  }

  const skillDirs = collectSkills(skillsSource);

  if (skillDirs.length === 0) {
    warn('Навыки не найдены.');
    return;
  }

  console.log();
  info(`Найдено навыков: ${skillDirs.length}`);
  info(`Claude Code не поддерживает вложенные папки в skills/ — будет выполнено выравнивание.`);
  console.log();

  // Build mapping: source dir → flat target name
  const mapping = skillDirs.map(src => {
    // e.g. config/skills/bitrix/bitrix-agent → bitrix-agent
    const skillName = path.basename(src);
    return {
      src,
      name: skillName,
      dest: path.join(skillsDest, skillName),
      label: `${path.relative(skillsSource, src)} → skills/${skillName}`,
    };
  });

  // Let user pick which skills to sync
  const selected = await checkbox({
    message: 'Выберите навыки для синхронизации:',
    choices: mapping.map(m => ({
      name: m.label,
      value: m,
      checked: true,
    })),
    pageSize: 20,
  });

  if (selected.length === 0) {
    info('Ничего не выбрано.');
    return;
  }

  // Check for conflicts
  const conflicts = selected.filter(m => fs.existsSync(m.dest));
  let overwriteAll = false;

  if (conflicts.length > 0) {
    warn(`${conflicts.length} навык(ов) уже существуют в целевом каталоге.`);
    const conflictAction = await select({
      message: 'Что делать с существующими?',
      choices: [
        { name: 'Перезаписать все', value: 'overwrite' },
        { name: 'Пропустить существующие', value: 'skip' },
        { name: 'Спрашивать по каждому', value: 'ask' },
      ],
    });

    if (conflictAction === 'overwrite') {
      overwriteAll = true;
    } else if (conflictAction === 'skip') {
      // Remove conflicts from selected
      const conflictPaths = new Set(conflicts.map(c => c.src));
      const filtered = selected.filter(m => !conflictPaths.has(m.src));
      return syncSkillsBatch(filtered);
    } else {
      // Ask per conflict
      for (const m of selected) {
        if (fs.existsSync(m.dest)) {
          const doOverwrite = await confirm({
            message: `Перезаписать ${m.name}?`,
          });
          if (doOverwrite) {
            copyDirSync(m.src, m.dest);
            ok(m.label);
          } else {
            info(`Пропущен: ${m.name}`);
          }
        } else {
          copyDirSync(m.src, m.dest);
          ok(m.label);
        }
      }
      return;
    }
  }

  await syncSkillsBatch(selected);
}

async function syncSkillsBatch(items) {
  for (const m of items) {
    copyDirSync(m.src, m.dest);
    ok(m.label);
  }
  ok(`Синхронизировано навыков: ${items.length}`);
}

// ── Commands sync ────────────────────────────────────────────────────

async function syncCommands() {
  const cmdsSource = path.join(CONFIG_DIR, 'commands');
  const cmdsDest = path.join(getClaudeHome(), 'commands');

  if (!fs.existsSync(cmdsSource)) {
    err(`Каталог commands не найден: ${cmdsSource}`);
    return;
  }

  // Commands also need flattening — same logic
  const cmdDirs = [];
  for (const entry of fs.readdirSync(cmdsSource, { withFileTypes: true })) {
    const full = path.join(cmdsSource, entry.name);
    if (entry.isDirectory()) {
      // Check if this dir itself has .md files (it's a command)
      const hasMd = fs.readdirSync(full).some(f => f.endsWith('.md') && !fs.statSync(path.join(full, f)).isDirectory());
      if (hasMd) {
        cmdDirs.push(full);
      }
      // Also check subdirs
      for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
        if (sub.isDirectory()) {
          const subFull = path.join(full, sub.name);
          const subHasMd = fs.readdirSync(subFull).some(f => f.endsWith('.md'));
          if (subHasMd) {
            cmdDirs.push(subFull);
          }
        }
      }
    }
  }

  if (cmdDirs.length === 0) {
    warn('Команды не найдены.');
    return;
  }

  console.log();
  info(`Найдено команд: ${cmdDirs.length}`);
  console.log();

  const mapping = cmdDirs.map(src => {
    const cmdName = path.basename(src);
    return {
      src,
      name: cmdName,
      dest: path.join(cmdsDest, cmdName),
      label: `${path.relative(cmdsSource, src)} → commands/${cmdName}`,
    };
  });

  const selected = await checkbox({
    message: 'Выберите команды для синхронизации:',
    choices: mapping.map(m => ({
      name: m.label,
      value: m,
      checked: true,
    })),
    pageSize: 20,
  });

  if (selected.length === 0) {
    info('Ничего не выбрано.');
    return;
  }

  for (const m of selected) {
    copyDirSync(m.src, m.dest);
    ok(m.label);
  }
  ok(`Синхронизировано команд: ${selected.length}`);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const claudeHome = getClaudeHome();

  console.log();
  console.log(chalk.bold('=^._.^= push-cat — Push Claude Code Catalog'));
  console.log(chalk.dim('─'.repeat(40)));
  info(`OS: ${os.platform()} (${os.arch()})`);
  info(`Home: ${os.homedir()}`);
  info(`Claude dir: ${claudeHome}`);
  info(`Config source: ${CONFIG_DIR}`);
  console.log();

  const tasks = await checkbox({
    message: 'Что синхронизировать?',
    choices: [
      { name: 'CLAUDE.md (глобальный)', value: 'claude-md', checked: true },
      { name: 'Skills (навыки)', value: 'skills', checked: true },
      { name: 'Commands (команды)', value: 'commands', checked: true },
    ],
  });

  if (tasks.length === 0) {
    info('Ничего не выбрано. Выход.');
    return;
  }

  for (const task of tasks) {
    console.log();
    console.log(chalk.bold.underline(
      task === 'claude-md' ? 'CLAUDE.md' :
      task === 'skills' ? 'Skills' : 'Commands'
    ));

    switch (task) {
      case 'claude-md': await syncClaudeMd(); break;
      case 'skills':    await syncSkills(); break;
      case 'commands':  await syncCommands(); break;
    }
  }

  console.log();
  ok('Готово!');
}

main().catch(e => {
  err(e.message);
  process.exit(1);
});
