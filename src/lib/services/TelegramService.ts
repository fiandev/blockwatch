import { channels } from "../../config/telegram-channels";

interface TelegramConfig {
  botToken: string;
  channel?: string; // channel name from channels config, defaults to 'crypto'
}

export class TelegramService {
  private botToken: string;
  private channel: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.channel = config.channel || 'crypto'; // default to crypto channel
  }

  async sendMessage(message: string): Promise<boolean> {
    try {
      const channelId = channels[this.channel];

      if (!channelId) {
        console.error(`❌ Telegram channel '${this.channel}' not found in config`);
        return false;
      }

      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
          parse_mode: 'HTML', // Allow HTML formatting
        }),
      });

      const result: any = await response.json();

      if (response.status !== 200) {
        console.error('❌ Failed to send Telegram message:', result);
        return false;
      }

      console.log('✅ Telegram message sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending Telegram message:', error);
      return false;
    }
  }

  setMessageTemplate(template: (tx: any) => string): (tx: any) => string {
    return template;
  }
}