# MoonTV(Branch)

<div align="center">
  <img src="public/logo.png" alt="LibreTV Logo" width="120">
</div>

> 🎬 **MoonTV** is a ready-to-use, cross-platform video aggregation player. It is built with **Next.js 14** + **Tailwind&nbsp;CSS** + **TypeScript**. It supports search across many sources, online playback, synced favorites, watch history, and local or cloud storage, so you can watch a large library of free videos anywhere.

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![Docker Ready](https://img.shields.io/badge/Docker-ready-blue?logo=docker)

</div>

---

## ✨ Features

- 🔍 **Multi-source search**: streaming search returns results quickly.
- 📄 **Rich detail pages**: episode list, cast, year, synopsis, and more.
- ▶️ **Smooth online playback**: built on HLS.js and ArtPlayer.
- ❤️ **Favorites and Continue Watching**: Redis/Upstash storage syncs progress across devices.
- 📱 **PWA**: offline cache and install to desktop or home screen for a native feel on mobile.
- 🌗 **Responsive layout**: sidebar on desktop, bottom navigation on mobile, fits any screen size.
- 🚀 **Simple deployment**: run the full service with one Docker command, or deploy to Vercel or Netlify for free.
- 👿 **Smart ad removal**: automatically skips ad segments in videos (experimental).

<details>
  <summary>Click to view screenshots</summary>
  <img src="public/screenshot1.png" alt="Screenshot" style="max-width:600px">
  <img src="public/screenshot2.png" alt="Screenshot" style="max-width:600px">
  <img src="public/screenshot3.png" alt="Screenshot" style="max-width:600px">
</details>

## 🗺 Contents

- [MoonTV(Branch)](#moontvbranch)
  - [✨ Features](#-features)
  - [🗺 Contents](#-contents)
  - [Tech Stack](#tech-stack)
  - [Deployment](#deployment)
    - [Vercel Deployment](#vercel-deployment)
      - [Standard Deployment (localstorage)](#standard-deployment-localstorage)
      - [Upstash Redis Support](#upstash-redis-support)
    - [Netlify Deployment](#netlify-deployment)
      - [Standard Deployment (localstorage)](#standard-deployment-localstorage-1)
      - [Upstash Redis Support](#upstash-redis-support-1)
    - [Docker Deployment](#docker-deployment)
  - [Environment Variables](#environment-variables)
  - [Configuration](#configuration)
  - [Admin Configuration](#admin-configuration)
  - [Android TV](#android-tv)
  - [Roadmap](#roadmap)
  - [Security and Privacy](#security-and-privacy)
    - [Set a Password and Disable Public Registration](#set-a-password-and-disable-public-registration)
    - [Deployment Requirements](#deployment-requirements)
    - [Disclaimer](#disclaimer)
  - [License](#license)
  - [Acknowledgements](#acknowledgements)

## Tech Stack

| Category       | Main dependencies                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Framework      | [Next.js 14](https://nextjs.org/) · App Router                                                        |
| UI and styling | [Tailwind&nbsp;CSS 3](https://tailwindcss.com/)                                                       |
| Language       | TypeScript 4                                                                                          |
| Player         | [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) · [HLS.js](https://github.com/video-dev/hls.js/) |
| Code quality   | ESLint · Prettier · Jest                                                                              |
| Deployment     | Docker · Vercel · pages                                                                               |

## Deployment

This project **supports Vercel, Docker, and Netlify** deployments.

Storage support matrix

|               | Docker | Vercel | Netlify |
| :-----------: | :----: | :----: | :-----: |
| Native Redis  |   ✅   |        |         |
| Upstash Redis |   ☑️   |   ✅   |   ✅    |

✅: tested and supported

☑️: supported in theory, not tested

### Vercel Deployment

#### Standard Deployment (localstorage)

1. **Fork** this repository to your GitHub account.
2. Log in to [Vercel](https://vercel.com/), click **Add New → Project**, and select your fork.
3. Set the `PASSWORD` environment variable.
4. Keep the default settings and finish the first deployment.
5. To customize `config.json`, edit that file in your fork directly.
6. Every push to the `main` branch triggers a new build automatically.

When the deployment finishes, open the assigned domain. You can also add a custom domain.

#### Upstash Redis Support

0. Finish the standard deployment and confirm that the site opens.
1. Sign up at [Upstash](https://upstash.com/) and create a Redis database with any name.
2. Copy the **HTTPS ENDPOINT and TOKEN** of the new database.
3. Go back to your Vercel project and add the environment variables **UPSTASH_URL and UPSTASH_TOKEN** with the endpoint and token from step 2.
4. Set the environment variable `NEXT_PUBLIC_STORAGE_TYPE` to **upstash**. Set `USERNAME` and `PASSWORD` for the site owner account.
5. Redeploy.

### Netlify Deployment

#### Standard Deployment (localstorage)

1. **Fork** this repository to your GitHub account.
2. Log in to [Netlify](https://www.netlify.com/), click **Add New project → Importing an existing project**, authorize GitHub, and select your fork.
3. Set the `PASSWORD` environment variable.
4. Keep the default settings and finish the first deployment.
5. Every push to the `main` branch triggers a new build automatically.

When the deployment finishes, open the assigned domain. You can also add a custom domain.

#### Upstash Redis Support

0. Finish the standard deployment and confirm that the site opens.
1. Sign up at [Upstash](https://upstash.com/) and create a Redis database with any name.
2. Copy the **HTTPS ENDPOINT and TOKEN** of the new database.
3. Go back to your Netlify project, open **Project Configuration → Environment variables**, and add **UPSTASH_URL and UPSTASH_TOKEN** with the endpoint and token from step 2.
4. Set the environment variable `NEXT_PUBLIC_STORAGE_TYPE` to **upstash**. Set `USERNAME` and `PASSWORD` for the site owner account.
5. Redeploy.

### Docker Deployment

https://github.com/MoonTechLab/LunaTV

## Environment Variables

| Variable                            | Description                                                            | Allowed values                   | Default                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| USERNAME                            | Admin account for deployments that do not use localstorage             | Any string                       | (empty)                                                                                                                          |
| PASSWORD                            | Admin password for deployments that do not use localstorage            | Any string                       | (empty)                                                                                                                          |
| NEXT_PUBLIC_SITE_NAME               | Site name                                                              | Any string                       | MoonTV                                                                                                                           |
| ANNOUNCEMENT                        | Site announcement                                                      | Any string                       | A disclaimer (in Chinese): the site only provides video search, stores no videos, and is not responsible for third-party content |
| NEXT_PUBLIC_STORAGE_TYPE            | Storage for watch history and favorites                                | localstorage, redis, d1, upstash | localstorage                                                                                                                     |
| REDIS_URL                           | Redis connection URL                                                   | Connection URL                   | (empty)                                                                                                                          |
| UPSTASH_URL                         | Upstash Redis connection URL                                           | Connection URL                   | (empty)                                                                                                                          |
| UPSTASH_TOKEN                       | Upstash Redis connection token                                         | Connection token                 | (empty)                                                                                                                          |
| NEXT_PUBLIC_ENABLE_REGISTER         | Allow registration (only for deployments that do not use localstorage) | true / false                     | false                                                                                                                            |
| NEXT_PUBLIC_SEARCH_MAX_PAGE         | Maximum number of pages the search API fetches                         | 1-50                             | 5                                                                                                                                |
| NEXT_PUBLIC_DOUBAN_PROXY_TYPE       | How Douban data is requested                                           | See below                        | direct                                                                                                                           |
| NEXT_PUBLIC_DOUBAN_PROXY            | Custom Douban data proxy URL                                           | URL prefix                       | (empty)                                                                                                                          |
| NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE | Douban image proxy type                                                | See below                        | direct                                                                                                                           |
| NEXT_PUBLIC_DOUBAN_IMAGE_PROXY      | Custom Douban image proxy URL                                          | URL prefix                       | (empty)                                                                                                                          |
| NEXT_PUBLIC_DISABLE_YELLOW_FILTER   | Turn off the adult content filter                                      | true / false                     | false                                                                                                                            |

`NEXT_PUBLIC_DOUBAN_PROXY_TYPE` options:

- direct: the server requests Douban directly.
- cors-proxy-zwei: the browser requests Douban data through a CORS proxy run by [Zwei](https://github.com/bestzwei).
- cmliussss-cdn-tencent: the browser requests data from a Douban CDN run by [CMLiussss](https://github.com/cmliu), accelerated by Tencent Cloud CDN.
- cmliussss-cdn-ali: the browser requests data from a Douban CDN run by [CMLiussss](https://github.com/cmliu), accelerated by Alibaba Cloud CDN.
- custom: a custom proxy, set with `NEXT_PUBLIC_DOUBAN_PROXY`.

`NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE` options:

- direct: the browser requests the default Douban image domain directly.
- server: the server proxies requests to the default Douban image domain.
- img3: the browser requests Douban's official premium CDN (Alibaba Cloud).
- cmliussss-cdn-tencent: the browser requests a Douban CDN run by [CMLiussss](https://github.com/cmliu), accelerated by Tencent Cloud CDN.
- cmliussss-cdn-ali: the browser requests a Douban CDN run by [CMLiussss](https://github.com/cmliu), accelerated by Alibaba Cloud CDN.
- custom: a custom proxy, set with `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY`.

## Configuration

In localstorage mode, all custom settings are in `config.json` in the project root.
In other storage modes, you can change the settings in the admin page of the deployed site.

```json
{
  "cache_time": 7200,
  "api_site": {
    "dyttzy": {
      "api": "http://caiji.dyttzyapi.com/api.php/provide/vod",
      "name": "DYTT Resources",
      "detail": "http://caiji.dyttzyapi.com"
    }
    // ...more sites
  },
  "custom_category": [
    {
      "name": "Chinese-language",
      "type": "movie",
      "query": "华语"
    }
  ]
}
```

- `cache_time`: API cache time in seconds.
- `api_site`: add, remove, or replace any video source site. Fields:
  - `key`: unique ID. Use lowercase letters and digits only.
  - `api`: root URL of the site's `vod` JSON API.
  - `name`: display name in the user interface.
  - `detail`: (optional) root URL of the site's web detail pages. Some sites do not return episode details through the API, so the app scrapes these pages instead.
- `custom_category`: custom categories that add your own video categories to the navigation. The pair `type` + `query` is the unique ID. Fields:
  - `name`: display name of the category (optional; if you omit it, the app shows `query`)
  - `type`: category type, `movie` or `tv`
  - `query`: search keyword for the Douban API

The `query` value must be the Douban tag in Chinese, exactly as listed below.

Known tags for `type: "movie"`:

| Category            | `query`      |
| ------------------- | ------------ |
| Hot                 | `"热门"`     |
| Latest              | `"最新"`     |
| Classics            | `"经典"`     |
| Top rated on Douban | `"豆瓣高分"` |
| Hidden gems         | `"冷门佳片"` |
| Chinese-language    | `"华语"`     |
| Western             | `"欧美"`     |
| Korean              | `"韩国"`     |
| Japanese            | `"日本"`     |
| Action              | `"动作"`     |
| Comedy              | `"喜剧"`     |
| Romance             | `"爱情"`     |
| Science fiction     | `"科幻"`     |
| Mystery             | `"悬疑"`     |
| Horror              | `"恐怖"`     |
| Feel-good           | `"治愈"`     |

Known tags for `type: "tv"`:

| Category           | `query`      |
| ------------------ | ------------ |
| Hot                | `"热门"`     |
| US series          | `"美剧"`     |
| UK series          | `"英剧"`     |
| Korean series      | `"韩剧"`     |
| Japanese series    | `"日剧"`     |
| Chinese series     | `"国产剧"`   |
| Hong Kong series   | `"港剧"`     |
| Japanese animation | `"日本动画"` |
| Variety shows      | `"综艺"`     |
| Documentaries      | `"纪录片"`   |

You can also enter any other keyword, such as a Chinese title (for example, `哈利波特` for Harry Potter). It works like a Douban search.

MoonTV supports the standard Apple CMS V10 API format.

After a change, **you do not need to rebuild**. The service reads the file once at startup.

## Admin Configuration

**This feature only works for deployments that do not use localstorage.**

You can change the service configuration at runtime.

The `USERNAME` and `PASSWORD` environment variables define the site owner. The site owner can make other users admins.

The site owner or an admin opens `/admin` to change the configuration.

## Android TV

You can use this project on Android TV with [OrionTV](https://github.com/zimplexing/OrionTV). It works directly as the OrionTV backend.

For now, favorites and watch history on OrionTV are separate from the web app. Syncing user data is planned.

## Roadmap

- [x] Dark mode
- [x] Persistent storage
- [x] Multiple accounts

## Security and Privacy

### Set a Password and Disable Public Registration

For your safety, and to avoid possible legal risks, you must set a password when you deploy, and we **strongly recommend that you disable public registration**:

- **Prevent public access**: anyone can open an instance without a password, and it can be misused.
- **Reduce copyright risk**: a public video search service can get copyright complaints.
- **Protect your privacy**: a password limits who can access the site and protects your watch history.

### Deployment Requirements

1. **Set the `PASSWORD` environment variable**: use a strong password for your instance.
2. **Personal use only**: do not share or publish the link to your instance.
3. **Follow local laws**: make sure your use complies with the laws where you live.

### Disclaimer

- This project is for learning and personal use only.
- Do not use a deployed instance for commercial purposes or as a public service.
- Users are responsible for any legal issues caused by sharing their instance publicly.
- The project developers are not legally responsible for how users use the project.

## License

[MIT](LICENSE) © 2025 MoonTV & Contributors

## Acknowledgements

- [ts-nextjs-tailwind-starter](https://github.com/theodorusclarence/ts-nextjs-tailwind-starter) — the project started from this template.
- [LibreTV](https://github.com/LibreSpark/LibreTV) — the inspiration for this project; we stand on the shoulders of giants.
- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) — a powerful web video player.
- [HLS.js](https://github.com/video-dev/hls.js) — HLS streaming playback in the browser.
- [Zwei](https://github.com/bestzwei) — the CORS proxy for Douban data.
- [CMLiussss](https://github.com/cmliu) — the Douban CDN service.
- Thanks to all sites that provide free video APIs.

---

<!-- ## Star History

[![Stargazers over time](https://starchart.cc/LunaTechLab/MoonTV.svg?variant=adaptive)](https://starchart.cc/LunaTechLab/MoonTV) -->
