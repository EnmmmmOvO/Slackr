import {fetchWithBackEnd} from "./helpers.js";

let token = undefined;
let userid = undefined;
let profile = undefined;
let channelListInfo = {};
let currentChannel = undefined;
let userList = {};

// set token and userid when user login
export const setTokenAndUserId = (newToken, newUserId) => {
  token = newToken;
  userid = newUserId;
};

// get token and userid
export const getToken = () => token;
export const getUserId = () => userid;

// set log in profile when user login
export const setProfile = newProfile => profile = newProfile;

// update channel list info, not including description and createdAt
export const updateChannelListInfo = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await fetchWithBackEnd('/channel', 'GET', undefined, getToken())
        .then((response) => {
          response.channels.forEach((channel) => {
            if (channelListInfo[channel.id] === undefined) {
              channelListInfo[channel.id] = {
                name: channel.name,
                creator: channel.creator,
                private: channel.private,
                members: channel.members,
                description: null,
                createdAt: null,
              };
            } else {
              channelListInfo[channel.id].name = channel.name;
              channelListInfo[channel.id].creator = channel.creator;
              channelListInfo[channel.id].private = channel.private;
              channelListInfo[channel.id].members = channel.members;
            }
          });
        })

      resolve(channelListInfo);
    } catch (error) {
      console.error("Error in updateChannelListInfo:", error);
      reject(error);
    }
  });
}

// set and get current channel for message show page
export const setCurrentChannel = id => currentChannel = id;

export const getCurrentChannel = () => currentChannel;

// get channel list info without update with backend
export const getChannelListInfoWithoutUpdate = id => channelListInfo[id];

// get each channel info with backend, including description and createdAt
export const getChannelListInfo = id => {
  return new Promise(async (resolve, reject) => {
    try {
      await fetchWithBackEnd(`/channel/${id}`, 'GET', undefined, getToken())
        .then((response) => {
          if (channelListInfo[id] === undefined) {
            channelListInfo[id] = {
              name: response.name,
              creator: response.creator,
              private: response.private,
              members: response.members,
              description: response.description,
              createdAt: response.createdAt,
            };
          } else {
            channelListInfo[id].description = response.description;
            channelListInfo[id].createdAt = response.createdAt;
          }
        })
      resolve(channelListInfo[id]);
    } catch (error) {
      console.error("Error in getUserInfo:", error);
      reject(error);
    }
  });
}

// update user list info, not including name, avatar and bio
export const requestNewUserList = async () => {
  await fetchWithBackEnd('/user', 'GET', undefined, getToken())
    .then((response) => {
      response.users.forEach((user) => {
        if (userList[user.id] === undefined) {
          userList[user.id] = {
            email: user.email,
            name: null,
            avatar: null,
            bio: null,
          }
        } else {
          userList[user.id].email = user.email;
        }
      });
    })
};

export const getUserList = () => userList;

// update each user info, including name, avatar and bio, not return back
export const updateUserInfo = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      for (const userId of Object.keys(userList)) {
        await fetchWithBackEnd(`/user/${userId}`, 'GET', undefined, getToken())
          .then((response) => {
            userList[userId].name = response.name;
            userList[userId].avatar = response.image;
            userList[userId].bio = response.bio;
          });
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export const getUserInfoWithoutFetch = userId => userList[userId];

// get requested user info with backend, including name, avatar and bio
export const getUserInfo = userId => {
  return new Promise(async (resolve, reject) => {
    try {
      await fetchWithBackEnd(`/user/${userId}`, 'GET', undefined, getToken())
        .then((response) => {
          userList[userId].name = response.name;
          userList[userId].avatar = response.image;
          userList[userId].bio = response.bio;
        });

      resolve(userList[userId]);
    } catch (error) {
      reject(error);
    }
  });
}
