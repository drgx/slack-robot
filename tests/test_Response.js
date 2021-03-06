/* eslint-env mocha */
/* eslint camelcase:0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Response from '../src/Response';

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

var slack = {
  openDM: sinon.stub(),
  getChannelGroupOrDMByID: sinon.stub(),
  getChannelGroupOrDMByName: sinon.stub(),
  getUserByID: sinon.stub(),
  getDMByName: sinon.stub()
};
var slackMessage = {
  channel: 'C238EYDH',
  user: 'U233REWD'
};
var channelInstanceMock = {name: 'Some channel', postMessage: sinon.spy()};
var userInstanceMock = {id: 'U233REWD', name: 'someuser'};

describe('lib/Response', () => {
  beforeEach(() => {
    slack.openDM.reset();
    slack.getUserByID.reset();
    slack.getChannelGroupOrDMByID.reset();
    slack.getChannelGroupOrDMByName.reset();
    slack.getDMByName.reset();
    channelInstanceMock.postMessage.reset();

    slack.getChannelGroupOrDMByID.withArgs(slackMessage.channel).returns(channelInstanceMock);
    slack.getUserByID.withArgs(slackMessage.user).returns(userInstanceMock);
  });

  it('should be able to set channel and user instance', () => {
    var res = new Response(slack);
    res.parse(slackMessage);
    res._channel.should.be.deep.equal(channelInstanceMock);
    res._user.should.be.deep.equal(userInstanceMock);
  });

  it('should be able to send response to channel/group/DM', done => {
    var res = new Response(slack);
    var response = {key: 'value'};

    res.parse(slackMessage);
    res.send(response).then(() => {
      channelInstanceMock.postMessage.should.be.calledWith({as_user: true, key: 'value'});
      done();
    });
  });

  it('should be able to send text response to channel/group/DM', done => {
    var res = new Response(slack);
    var message = 'some text message';

    res.parse(slackMessage);
    res.sendText(message).then(() => {
      channelInstanceMock.postMessage.should.be.calledWith({as_user: true, text: message});
      done();
    });
  });

  it('should be able to reply via DM', done => {
    var res = new Response(slack);
    var response = {via: 'dm'};

    // prepare stub
    var dmStub = {postMessage: sinon.stub()};
    slack.openDM.callsArgWith(1);
    slack.getDMByName.returns(dmStub);

    res.parse(slackMessage);
    res.sendDM(response).then(() => {
      slack.openDM.getCall(0).args[0].should.be.equal(userInstanceMock.id);
      dmStub.postMessage.should.be.calledWith({as_user: true, via: 'dm'});
      done();
    });
  });

  it('should be able to reply text via DM', done => {
    var res = new Response(slack);
    var message = 'text via dm';

    // prepare stub
    var dmStub = {postMessage: sinon.stub()};
    slack.openDM.callsArgWith(1);
    slack.getDMByName.returns(dmStub);

    res.parse(slackMessage);
    res.sendTextDM(message).then(() => {
      slack.openDM.getCall(0).args[0].should.be.equal(userInstanceMock.id);
      dmStub.postMessage.should.be.calledWith({as_user: true, text: 'text via dm'});
      done();
    });
  });

  it('should be reject promise if not able to reply dm', () => {
    var res = new Response(slack);
    var message = 'text via dm';

    // prepare stub
    slack.openDM.callsArgWith(1);
    slack.getDMByName.returns(undefined);

    res.parse(slackMessage);
    return res.sendTextDM(message).should.be.rejected;
  });

  it('should be able to send response to specific channel/group/dm instead of reply', done => {
    var res = new Response(slack);
    var response = {specific: 'channel/group/dm'};

    // prepare stub
    var chatStub = {postMessage: sinon.stub()};
    slack.getChannelGroupOrDMByName.returns(chatStub);

    res.parse(slackMessage);
    res.sendTo('#general', response).then(() => {
      slack.getChannelGroupOrDMByName.should.be.calledWith('#general');
      chatStub.postMessage.should.be.calledWith({as_user: true, specific: 'channel/group/dm'});
      done();
    });
  });

  it('should be able to send text to specific channel/group/DM', done => {
    var res = new Response(slack);
    var message = 'message for #channel or @group';

    // prepare stub
    var chatStub = {postMessage: sinon.stub()};
    slack.getChannelGroupOrDMByName.returns(chatStub);

    res.parse(slackMessage);
    res.sendTextTo('#general', message).then(() => {
      chatStub.postMessage.should.be.calledWith({as_user: true, text: 'message for <#channel> or <!group>'});
      done();
    });
  });

  it('should be able to reply to user', done => {
    var res = new Response(slack);
    var message = 'hula';

    res.parse(slackMessage);
    res.reply(message).then(() => {
      channelInstanceMock.postMessage.should.be.calledWith({as_user: true, text: `<@${userInstanceMock.name}>: hula`});
      done();
    });
  });

  it('should be throw error if reply using object', () => {
    var res = new Response(slack);
    var errorMessage = 'You can only reply using simple string';
    var message = {x: 'x'};

    res.parse(slackMessage);
    return res.reply(message).should.be.rejectedWith(errorMessage);
  });
});
