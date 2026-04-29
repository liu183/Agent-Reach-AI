import type { Channel } from './base';
import { webChannel } from './web';
import { youtubeChannel } from './youtube';
import { twitterChannel } from './twitter';
import { redditChannel } from './reddit';
import { githubChannel } from './github';
import { rssChannel } from './rss';
import { v2exChannel } from './v2ex';
import { xiaohongshuChannel } from './xiaohongshu';
import { bilibiliChannel } from './bilibili';
import { weiboChannel } from './weibo';
import { douyinChannel } from './douyin';
import { linkedinChannel } from './linkedin';
import { xueqiuChannel } from './xueqiu';
import { wechatChannel } from './wechat';
import { xiaoyuzhouChannel } from './xiaoyuzhou';
import { exaSearchChannel } from './exa-search';

const channelMap: Record<string, Channel> = {
  'web': webChannel,
  'youtube': youtubeChannel,
  'twitter': twitterChannel,
  'reddit': redditChannel,
  'github': githubChannel,
  'rss': rssChannel,
  'v2ex': v2exChannel,
  'xiaohongshu': xiaohongshuChannel,
  'bilibili': bilibiliChannel,
  'weibo': weiboChannel,
  'douyin': douyinChannel,
  'linkedin': linkedinChannel,
  'xueqiu': xueqiuChannel,
  'wechat': wechatChannel,
  'xiaoyuzhou': xiaoyuzhouChannel,
  'exa-search': exaSearchChannel,
};

export function getChannel(id: string): Channel | undefined {
  return channelMap[id];
}

export function getAllChannels(): Channel[] {
  return Object.values(channelMap);
}

export function findChannelForUrl(url: string): Channel | undefined {
  return getAllChannels().find((ch) => ch.canHandle(url)) || webChannel;
}
