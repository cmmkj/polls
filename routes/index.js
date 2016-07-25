var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var db = mongoose.createConnection('localhost','pollsapp');
var PollSchema = require('../models/Poll.js').PollSchema;
var Poll = db.model('polls',PollSchema);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Polls' });
});

module.exports = router;


router.get('/polls/polls',function(req,res){
    Poll.find({},'question',function(error,polls){
        console.log("polls/polls");
        res.json(polls);
    });
});

router.get('/polls/:id',function(req,res){
    var pollId = req.params.id;
    console.log("polls/:id")
    console.log(pollId);
    Poll.findById(pollId,'',{lean: true},function(err,poll){
        if(poll){
            var userVoted = false,
                userChoice,
                totalVotes = 0;
            for(c in poll.choices){
                var choice = poll.choices[c];
                for(v in choice.votes){
                    var vote = choice.votes[v];
                    totalVotes++;
                    if(vote.ip === (req.header('x-forwarded-for') || req.ip)){
                        userVoted = true;
                        userChoice = {_id:choice._id,text:choice.text };
                    }
                }
            }
            poll.userVoted = userVoted;
            poll.userChoice = userChoice;
            poll.totalVotes = totalVotes;
            res.json(poll);
        }else{
            res.json({error:true});
        }
    });
});


router.post('/polls',function(req,res){
    console.log("polls!!!!!!!!!!!!!!!!!!");
    var reqBody = req.body;
    var choices = reqBody.choices.filter(function(v){return v.text != '';});
    var pollObj = {question:reqBody.question,choices:choices};
    var poll = new Poll(pollObj);
    poll.save(function(err,doc){
        if(err || !doc){
            throw 'Error';
        }else{
            res.json(doc);
        }
    });

});



router.vote = function(socket){
    console.log("router.vote");
    socket.on('send:vote',function(data){
        var ip = socket.handshake.headers['x-forworded-for'] || socket.handshake.address.address;
        Poll.findById(data.poll_id,function(err,poll){
            var choice = poll.choices.id(data.choice);
            choice.votes.push({ip:ip});
            poll.save(function(err,doc){
                var theDoc = {
                    question:doc.question,_id: doc._id,choices:doc.choices,
                    userVoted:false,
                    totalVotes:0
                };
                for(var i = 0,ln = doc.choices.length;i < ln;i++){
                    console.log(ln);
                    console.log("router.vote+++++");
                    var choice = doc.choices[i];
                    for(var j = 0,jln = choice.votes.length;j < jln;j++){
                        var vote = choice.votes[j];
                        theDoc.totalVotes++;
                        theDoc.ip = ip;
                        if(vote.ip === ip){
                            theDoc.userVoted = true;
                            theDoc.userChoice = {_id: choice._id,text :choice.text};
                        }
                    }
                }
                socket.emit('myvote',theDoc);
                socket.broadcast.emit('vote',theDoc);
            });
        });
    });
};





















