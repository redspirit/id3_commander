// const blessed = require('blessed');
const blessed = require('neo-blessed');
const fs = require('fs');
const path = require('path');
const ID3 = require('node-id3');

// Инициализация экрана
const screen = blessed.screen({
    smartCSR: true,
    title: 'MP3-редактор тегов (Blessed)',
});

// let currentDir = process.cwd();
let currentDir = '/mnt/homeserver/MUSIC/';
let selectedMp3 = null;
let editMode = false;

// Элементы интерфейса
const statusBar = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: `Текущий каталог: ${currentDir} | Режим: ${
        editMode ? 'РЕДАКТИРОВАНИЕ' : 'ПРОСМОТР'
    }`,
    style: { bg: 'grey', fg: 'black' },
});

const mp3Table = blessed.listtable({
    top: 1,
    left: 0,
    width: '60%',
    height: '100%-1',
    keys: true,
    vi: true,
    padding: { left: 1 },
    style: {
        header: { fg: 'blue', bold: true },
        cell: {
            selected: { bg: 'blue', fg: 'white' },
            align: 'left',
            // Разные цвета для папок и файлов
            item: (el, i) => {
                const content = el.getText();
                return content.startsWith('[D]')
                    ? { fg: 'cyan' }
                    : content.endsWith('.mp3')
                    ? { fg: 'white' }
                    : { fg: 'gray' };
            },
        },
    },
    border: { type: 'line' },
    data: [['Тип', 'Имя', 'Название', 'Исполнитель', 'Альбом']],
});

const metadataPanel = blessed.box({
    top: 1,
    left: '60%',
    width: '40%',
    height: '100%-1',
    content: 'Выберите MP3-файл...',
    border: { type: 'line' },
    style: { fg: 'white' },
    scrollable: true,
});

// Текстовые поля для редактирования (изначально скрыты)
const editFields = {
    title: blessed.textbox({
        top: 3,
        left: '15%',
        width: '80%',
        height: 1,
        hidden: true,
        style: { bg: 'black', fg: 'yellow' },
    }),
    artist: blessed.textbox({
        top: 5,
        left: '15%',
        width: '80%',
        height: 1,
        hidden: true,
        style: { bg: 'black', fg: 'yellow' },
    }),
    album: blessed.textbox({
        top: 7,
        left: '15%',
        width: '80%',
        height: 1,
        hidden: true,
        style: { bg: 'black', fg: 'yellow' },
    }),
};

// Кнопки управления
const editButton = blessed.button({
    top: '80%',
    left: '10%',
    width: 20,
    height: 1,
    content: '{center}Редактировать{/center}',
    style: { bg: 'blue', fg: 'black' },
    hidden: true,
});

const saveButton = blessed.button({
    top: '80%',
    left: '40%',
    width: 20,
    height: 1,
    content: '{center}Сохранить{/center}',
    style: { bg: 'green', fg: 'black' },
    hidden: true,
});

const cancelButton = blessed.button({
    top: '80%',
    left: '70%',
    width: 20,
    height: 1,
    content: '{center}Отмена{/center}',
    style: { bg: 'red', fg: 'black' },
    hidden: true,
});

// Добавляем элементы на экран
screen.append(statusBar);
screen.append(mp3Table);
screen.append(metadataPanel);
Object.values(editFields).forEach((field) => screen.append(field));
screen.append(editButton);
screen.append(saveButton);
screen.append(cancelButton);

// Обновление списка файлов и папок
function updateFileList(dir) {
    currentDir = dir;
    statusBar.setContent(
        `Текущий каталог: ${currentDir} | Режим: ${
            editMode ? 'РЕДАКТИРОВАНИЕ' : 'ПРОСМОТР'
        }`
    );

    fs.readdir(dir, { withFileTypes: true }, (err, items) => {
        if (err) {
            mp3Table.setData([['Ошибка чтения каталога!']]);
            return;
        }

        const tableData = items.map((item) => {
            if (item.isDirectory()) {
                return ['[D]', item.name, 'Папка', '', ''];
            } else if (
                item.isFile() &&
                item.name.toLowerCase().endsWith('.mp3')
            ) {
                const tags = ID3.read(path.join(dir, item.name)) || {};
                return [
                    '[F]',
                    item.name,
                    tags.title || '-',
                    tags.artist || '-',
                    tags.album || '-',
                ];
            } else {
                return ['[F]', item.name, 'Не MP3', '', '']; // Другие файлы
            }
        });

        // Сортируем: сначала папки, потом MP3, потом остальные файлы
        tableData.sort((a, b) => {
            if (a[0] === '[D]' && b[0] !== '[D]') return -1;
            if (a[0] !== '[D]' && b[0] === '[D]') return 1;
            if (a[1].endsWith('.mp3') && !b[1].endsWith('.mp3')) return -1;
            if (!a[1].endsWith('.mp3') && b[1].endsWith('.mp3')) return 1;
            return a[1].localeCompare(b[1]);
        });

        mp3Table.setData([
            [
                'Тип',
                'Имя',
                'Название',
                'Исполнитель',
                'Альбом',
            ],
            ...tableData,
        ]);
        screen.render();
    });
}

// Переключение режима редактирования
function toggleEditMode() {
    editMode = !editMode;
    statusBar.setContent(
        `Текущий каталог: ${currentDir} | Режим: ${
            editMode ? 'РЕДАКТИРОВАНИЕ' : 'ПРОСМОТР'
        }`
    );

    if (editMode) {
        // Показываем поля редактирования
        Object.values(editFields).forEach((field) => (field.hidden = false));
        editButton.hidden = true;
        saveButton.hidden = false;
        cancelButton.hidden = false;
        editFields.title.focus();
    } else {
        // Скрываем поля редактирования
        Object.values(editFields).forEach((field) => (field.hidden = true));
        editButton.hidden = false;
        saveButton.hidden = true;
        cancelButton.hidden = true;
        mp3Table.focus();
    }

    updateMetadataDisplay();
    screen.render();
}

// Обновление отображения метаданных
function updateMetadataDisplay() {
    if (!selectedMp3) return;

    const filePath = path.join(currentDir, selectedMp3);
    const tags = ID3.read(filePath) || {};

    if (editMode) {
        metadataPanel.setContent(`
{bold}${selectedMp3}{/bold}
----------------------------
{green-fg}Название:{/}
{green-fg}Исполнитель:{/}
{green-fg}Альбом:{/}
----------------------------
{yellow-fg}Комментарий:{/} ${tags.comment?.text || '-'}
    `);
    } else {
        metadataPanel.setContent(`
{bold}${selectedMp3}{/bold}
----------------------------
{green-fg}Название:{/} ${tags.title || '-'}
{green-fg}Исполнитель:{/} ${tags.artist || '-'}
{green-fg}Альбом:{/} ${tags.album || '-'}
----------------------------
{yellow-fg}Комментарий:{/} ${tags.comment?.text || '-'}
    `);
    }
}

// Показать метаданные
function showMetadata(mp3File) {
    selectedMp3 = mp3File;
    const filePath = path.join(currentDir, mp3File);
    const tags = ID3.read(filePath) || {};

    // Заполняем поля редактирования
    editFields.title.setValue(tags.title || '');
    editFields.artist.setValue(tags.artist || '');
    editFields.album.setValue(tags.album || '');

    // Показываем кнопку редактирования
    editButton.hidden = false;
    saveButton.hidden = true;
    cancelButton.hidden = true;

    updateMetadataDisplay();
    screen.render();
}

// Сохранение тегов
function saveTags() {
    if (!selectedMp3) return;

    const filePath = path.join(currentDir, selectedMp3);
    const tags = {
        title: editFields.title.getValue(),
        artist: editFields.artist.getValue(),
        album: editFields.album.getValue(),
    };

    ID3.write(tags, filePath);
    toggleEditMode();
    updateFileList(currentDir);
}

// Обработчики событий
editButton.on('press', toggleEditMode);
saveButton.on('press', saveTags);
cancelButton.on('press', toggleEditMode);

// Обработка выбора элемента
mp3Table.on('select', (item, index) => {
    if (index <= 0) return; // Пропускаем заголовок

    // Получаем содержимое строки таблицы
    const rowText = item.getText();

    // Парсим строку (удаляем ANSI-коды и лишние пробелы)
    const cleanText = rowText.replace(/\x1b\[[0-9;]*m/g, '').trim();
    const [itemType, itemName] = cleanText.split(/\s+/);

    // console.log('Parsed:', { itemType, itemName }); // Дебаг

    if (itemType === '[D]') {
        // Обработка директории
        const newPath = path.join(currentDir, itemName);
        // console.log('Navigating to:', newPath); // Дебаг

        if (fs.existsSync(newPath)) {
            updateFileList(newPath);
            metadataPanel.setContent('{cyan-fg}Переход в папку...{/}');
        } else {
            metadataPanel.setContent('{red-fg}Ошибка: папка не существует{/}');
        }
    } else if (itemName.toLowerCase().endsWith('.mp3')) {
        // Обработка MP3-файла
        selectedMp3 = itemName;
        showMetadata(itemName);
    }
});

// Навигация назад (Backspace)
screen.key(['backspace'], () => {
    if (editMode) return;
    const parentDir = path.dirname(currentDir);
    if (parentDir !== currentDir) {
        updateFileList(parentDir);
        metadataPanel.setContent('Выберите файл для просмотра тегов...');
        selectedMp3 = null;
        editButton.hidden = true;
    }
});

screen.key(['C-c', 'q'], () => process.exit(0));

// Инициализация
updateFileList(currentDir);
mp3Table.focus();
screen.render();
