#!/usr/bin/python3

from vaserving.vaserving import VAServing
from vaserving.pipeline import Pipeline
import time
import os

#network_preference = os.environ.get("NETWORK_PREFERENCE")

class RunVA(object):
    def __init__(self):
        super(RunVA, self).__init__()
        vaserving_args = {'model_dir': '/home/models',
                          'pipeline_dir': '/home/pipelines',
                          'max_running_pipelines': 1,
#                          'network_preference': network_preference,
                          'log_level': "DEBUG"}
        VAServing.start(vaserving_args)

    def _noop(self):
        return True

    def loop(self, reqs, _pipeline, _version="1"):
        print(reqs, flush=True)
        source = reqs["source"]
        destination = reqs["destination"]
        tags = reqs["tags"]
        parameters = reqs["parameters"]

        pipeline = VAServing.pipeline(_pipeline, _version)
        instance_id = pipeline.start(source=source,
                             destination=destination,
                             tags=tags,
                             parameters=parameters)
        if instance_id is None:
            print("Pipeline {} version {} Failed to Start".format(
               _pipeline, _version), flush=True)
            return -1

        fps=0
        while True:
            status = pipeline.status()
            print(status, flush=True)

            if (status.state.stopped()):
                print("Pipeline {} Version {} Instance {} Ended with {}".format(
                    _pipeline, _version, instance_id, status.state.name), flush=True)
                break

            if status is not None: 
                state = status["state"]
                if state == "COMPLETED":
                    fps=status["avg_fps"]
                    print("Status analysis: Timing {0} {1} {2} {3} {4}".format(reqs["start_time"], status["start_time"], status["elapsed_time"], reqs["user"], reqs["source"]["uri"]), flush=True)
                    break
                if state == "ABORTED" or state == "ERROR": return -1

        print("exiting va pipeline", flush=True)
        pipeline.stop()
        VAServing.stop()
        return fps
