import config from './config.js'

// const development =
//     location.host.search(/.+\.github\.io/) === -1 &&
//     location.host.search(/nonememe\.icu/) === -1
const memeRegex = /^meme\/((.+)\.(?:jpg|png|jfif|webp|gif|jpeg|bmp))$/i;
// positive lookbehind (?<=) is not supported by all browsers.
// global flag (g) will not capture groups
// [0] is full path (meme/id.jpg)
// [1] is file name (id.jpg)
// [2] is id (id)
const development = false
const domParser = new DOMParser()
/** @type {string[]} */
let items = []
let displayedItemCount = 0

const galleryIO = new IntersectionObserver((entries) => {
    if (entries[0].intersectionRatio > 0 && displayedItemCount < items.length)
        loadgallery(10)
})

/**
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * @param {{
    id: string;
    src: string;
    alt: string;
    title: string;
}} obj
 * @returns {Element}
 */
function createMemeElement(obj) {
    const id = 'gallery-item';
    let temp = document.createElement('div');
    temp.innerHTML = document.getElementById(id).innerHTML;
    temp.querySelector("a").href = obj.id;
    temp.querySelector("img").src = obj.src;
    temp.querySelector("img").alt = obj.alt;
    temp.querySelector("span").textContent = obj.title;
    return temp.children[0];
}

/**
 * @param {string} url
 * @returns {Promise<XMLHttpRequest>}
 */
function get(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', url)
        xhr.addEventListener('load', () => resolve(xhr))
        xhr.addEventListener('error', () => reject(xhr))
        xhr.send()
    })
}

async function loadgallery(remainItemCount) {
    if (remainItemCount <= 0 || displayedItemCount >= items.length) {
        if (displayedItemCount >= items.length) {
            console.log("已加载全部图片。");
        }
        galleryIO.observe(document.getElementById('footer'))
        return
    }
    galleryIO.unobserve(document.getElementById('footer'))

    // 获取高度最小的列
    const column = [
        document.getElementById('col1'),
        document.getElementById('col2'),
        document.getElementById('col3'),
    ].sort((a, b) => a.offsetHeight - b.offsetHeight)[0]

    let match = items[displayedItemCount].match(memeRegex);
    if (match === null) {
        displayedItemCount += 1;
        loadgallery(remainItemCount - 1);
        return;
    }
    let filename = match[1];
    let id = match[2];
    const node = createMemeElement({
        id: `#${encodeURIComponent(id)}`,
        src: "./meme/" + encodeURIComponent(filename),
        alt: items[displayedItemCount],
        title: `# ${id}`,
    })

    // 加载好以后再执行下一个图片的加载以保证顺序没问题
    node.querySelector('img').addEventListener('load', () =>
        loadgallery(remainItemCount - 1)
    )
    column.append(node)
    displayedItemCount += 1
}

function view() {
    const view = document.getElementById('view')
    view.style.display = {
        true: 'none',
        false: 'block',
    }[!location.hash || location.hash == '#']
    let name = decodeURIComponent(
        location.hash.substring(1, location.hash.length)
    )
    view.querySelector('h2').innerHTML = `# ${name}`
    for (const i of items) {
        let match = i.match(memeRegex);
        if (match[2] === name) {
            name = match[1];
            break;
        }
    }

    let imgSource = "./meme/" + encodeURIComponent(name);
    view.querySelector('img').src = imgSource;
    view.querySelector('img').alt = name;
    view.querySelector('a').href = imgSource;
    window.scrollTo({
        top: view.offsetTop,
        behavior: 'smooth',
    })
}

async function initgallery() {
    document.getElementById(
        'description'
    ).innerHTML = `ICQQ群日常, 目前已有 ${items.length} 张。`
    document.getElementById('refresh-btn').onclick = () => {
        location.hash = `#${items[random(0, items.length - 1)].match(memeRegex)[2]}`
    }
    for (let i = 0; i < items.length - 1; i++) {
        const j = random(i, items.length - 1)
        const temp = items[i]
        items[i] = items[j]
        items[j] = temp
    }
    await loadgallery(10)
    galleryIO.observe(document.getElementById('footer'))
    view()
}

; (async () => {
    /**
     * 判断使用何种 API , 获取图片列表
     */

    // 开发环境(使用 live server)
    if (development) {
        for (const i of domParser
            .parseFromString((await get('../meme/')).response, 'text/html')
            .querySelectorAll('#files a.icon-image')) {
            items.push(
                'meme/' + decodeURIComponent(i.href.match(memeRegex)[1])
            )
        }
    } else {
        // 生产环境(使用静态文件)
        items = config.items
    }

    initgallery()
    window.addEventListener('hashchange', view)
})()
