

const logger = require("../../../logger");
const config = require("../../../config");
const { Api } = require('telegram');
const getLang = require("../../../bot/i18n/utils");
const translate = require("../../../bot/i18n/t9n");
const editDict = require("../../../bot/i18n/edtB10");
const { limitHandler, timeLimitError } = require("./limitHandler");


// Define a custom error class that extends the built-in Error class
class userNotJoined extends Error {
    constructor(message, code) {
        // Call the constructor of the parent class (Error)
        super(message);

        // Set the name of the error for identification
        this.name = 'userNotJoined';
    }
}

/**
 * Handles the force subscription logic based on the provided configuration.
 * @param {Object} params        - Parameters for the force subscription logic.
 * @param {Object} params.client - The Gram.js Client 
 * @param {Object} params.update - Object containing information about new message instance.
 * @returns {Promise}            - A promise that resolves with the result of the force subscription operation.
 * @throws {timeLimitError}      - Thrown if a time limit error occurs during the operation.
 * @throws {userNotJoined}       - Thrown if the user is not joined and a force subscription is attempted.
 */

const forceSub = async ({ client, update, checkLimit = false }) => {
    try{
        // Check if force subscription and request URL are both disabled
        if (!config.CHANNEL_INFO.FORCE_SUB && !config.CHANNEL_INFO.REQUEST_URL){
            // Time limit checking
            if (checkLimit){
                await limitHandler({
                    client: client,
                    userId: update.message.chatId.value
                })
            }
            return true;
        }

        // If force subscription is enabled, attempt to get participant information
        if (config.CHANNEL_INFO.FORCE_SUB) {
            const result = await client.invoke(
                new Api.channels.GetParticipant({
                    channel: config.CHANNEL_INFO.FORCE_SUB,
                    participant: update.message.chatId.value
                })
            );

            // Time limit checking
            if (checkLimit){
                await limitHandler({
                    client: client,
                    userId: update.message.chatId.value
                })
            }

            return result;
        }

    } catch (error) {

        if (error instanceof timeLimitError) {
            throw error;
        } else {
            let lang_code = await getLang(update.message.chatId);
            let translated = await translate({
                text: 'force.message', button: 'force.button',
                langCode: lang_code, asString: true
            });

            let newButton = await editDict({
                inDict : translated.button,
                value : config.CHANNEL_INFO.FORCE_URL
            })
            newButton = await createButton({
                button : newButton, order : '11'
            })

            await client.sendMessage(update.message.chatId, {
                message: translated.text,
                buttons: client.buildReplyMarkup(
                    newButton
                ),
                replyTo: update.message.id
            });

            logger.log('info', `${update.message.chatId} cause error: ${error.message}`);

            throw new userNotJoined("USER_NOT_JOINED")
        }
    }
};

module.exports = { forceSub };