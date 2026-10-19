# Experiment Marker 🧪

**A local-first, offline-capable event marker for experimental research.**

*把注意力留给实验，把时间交给程序。*

[**Launch Experiment Marker ↗**](https://maryyu-524.github.io/experiment-marker-pwa/)

---

## 🌱 How it started

故事始于一个非常朴素的问题：

**能不能让实验现场的事件记录，少一点手忙脚乱？**

在采集 EEG 数据的过程中，我需要记录麻醉诱导、手术操作等关键事件发生的时刻，并将它们与脑电采集设备的时间轴对应起来。

问题是，不同设备的时钟未必一致。传统记录方式往往意味着：

看时间、记时间、计算偏移、整理事件、再次核对……

这些操作都不复杂，但在真实实验现场，它们会不断消耗注意力。

于是我想：

既然时间戳和时钟偏移都可以被程序处理，为什么不做一个小工具，把这些重复劳动交给电脑？

**Experiment Marker 就这样诞生了。**

最初，它只是一个用于记录实验事件、辅助计算时间偏移的小程序。

后来，它逐渐拥有了状态恢复、事件纠错、数据归档、批量导出和离线运行的能力。

不过，它的设计目标始终没有改变：

> Make experimental event recording simple, reliable, and a little less tedious.

## ✨ What it does

**01 · Event marking**

实验开始后，通过预设按钮快速记录关键事件。

每次标记保留事件名称、绝对时间戳、实验开始后的相对时间，以及可选备注。

**02 · Time calibration**

手动输入参考时钟与 EEG／设备时钟，计算两者的时间偏移。

`Clock offset = Reference clock − EEG clock`

根据这个偏移量，为已记录事件计算对应的设备时间。

支持跨午夜时间换算，以及精确到秒的 24 小时制三列滚轮选择器。

**03 · Non-destructive corrections**

实验现场难免出现误触和标记错误。

可以撤销、恢复、重命名事件，且保留原始时间戳。

纠错应当改变记录的解释，而不是悄悄改写发生过的时间。

**04 · Case Library**

将完成的实验显式保存到本地病例库。

一个很重要的设计约定：

`COMPLETE ≠ ARCHIVED`

实验结束，不代表它已经正式归档。用户需要自行确认是否保存。

**05 · Flexible export**

提供三种数据出口：

- **Export CSV**：导出当前病例的标准化事件表。
- **Export All CSV (.ZIP)**：将所有已归档病例分别转换为 CSV，并打包下载。
- **Back Up Case Library (.JSON)**：保存整份归档库的结构化数据快照。

**06 · Offline-first workflow**

支持作为 PWA 添加到手机主屏幕。

应用资源完成缓存后，可以在离线环境中使用核心记录功能。

实验数据主要保存在当前设备的浏览器本地存储中，不需要登录账号或连接云端。

## 📱 How to use

1. 打开 [Experiment Marker](https://maryyu-524.github.io/experiment-marker-pwa/)，输入 Case ID 和 Experiment Type。
2. 点击 **START EXPERIMENT**，根据实际实验过程标记事件。
3. 根据需要填写 Reference clock 和 EEG／device clock，点击 **Apply Calibration**。
4. 实验结束后进入 COMPLETE，检查事件、修正错误，导出 CSV。
5. 将病例保存到 **Case Library**，并定期导出批量 CSV 和 JSON Backup。

在 iPhone 上，可以使用 Safari 的「添加到主屏幕」功能，将它作为独立的桌面应用使用。

## 🧠 A few design principles

这个项目没有特别复杂的技术架构，但我为一些看似微小的问题反复思考过。

**Timestamp first.** 先获取事件发生时刻，再进行后续存储操作。

**Original data matters.** 事件可以重新解释，但原始时间戳不应被覆盖。

**Explicit actions over hidden automation.** 结束实验、正式归档和更新归档是不同的操作，不应该被系统悄悄合并。

**Local-first, but not backup-free.** 本地存储方便使用，却不能替代独立的数据备份。

**Simplicity is a feature.** 它应该在研究者最忙的时候依然足够容易使用。

## 🧰 Under the hood

- HTML / CSS / Vanilla JavaScript
- IndexedDB + localStorage
- Service Worker / PWA
- CSV / JSON / ZIP export
- Git & GitHub Pages

不需要后端服务器，也不依赖在线数据库。

这不是一个实验数据分析平台。它不处理原始 EEG、不执行信号预处理，也不负责统计建模。

**它负责把事件和时间整理好，后面的科学问题交给研究者。**

## ⚠️ Notes & limitations

这是一个个人研究工具项目，目前并非经过正式验证的医疗设备或临床决策系统。

- 时间标记依赖运行设备的系统时钟及人工操作，存在相应的计时与操作误差。
- Time Calibration 是手动时钟偏移校正，并非设备间自动硬件同步。
- 数据默认保存在本地浏览器中，清除网站数据、卸载应用或设备故障都可能造成数据丢失。
- JSON Backup 当前用于保存完整归档快照，尚未提供应用内 Restore／Import 功能。
- 请使用去标识化 Case ID，不要在记录中填写患者可识别的个人信息。

**Local storage is not a backup. Export your data regularly.**

## 🤖 Built with AI, directed by curiosity

Experiment Marker 是一个 AI-assisted development 项目。

我没有传统的软件工程教育背景。最初接触 Python，是因为医学科研中的真实数据处理需求。

从 Python、MNE 到 HTML、CSS、JavaScript，从本地运行到 PWA 部署，许多技术概念都是在解决具体问题的过程中逐渐建立起来的。

在 ChatGPT 等 AI 工具的辅助下，我可以将自己的需求转化为可运行的代码，再通过测试、追问、调试和迭代，逐渐理解其背后的工作机制。

AI 降低了实现的门槛，但问题的定义、功能的取舍，以及哪些结果值得相信，仍然需要人来判断。

对我来说，这个项目不仅是一个小工具，也是一次跨越学科边界的实践：

**从一个真实问题出发，亲手构建一个能够工作的系统。**

## 💌 A note from Mary

我很喜欢的一种学习方式是：

*先做出来，再慢慢理解为什么。*

这并不意味着放弃严谨，而是允许自己先进入一个陌生领域，在真实反馈中逐渐建立认知。

Experiment Marker 可能不会成为一个多么宏大的软件项目。

但它确实解决了我曾经需要亲手处理的一些琐碎问题，也让我第一次完整体验了从需求、设计、开发、调试到部署的过程。

这就已经很有意思了。

也许未来它会继续生长，也许它就停留在这里，安静地成为我科研工作流中的一个小工具。

无论如何，都很高兴把这个小小的作品留在 GitHub 上。

*Made with curiosity, persistence, a little perfectionism, and a lot of AI-assisted debugging.*

**— MaryYu 🌷**
